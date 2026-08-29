import { Op } from 'sequelize';

import { Customer } from '../models/index.js';
import {
  CONTRACT_VALUES,
  GENDER_VALUES,
  INTERNET_ADD_ON_VALUES,
  INTERNET_SERVICE_VALUES,
  MULTIPLE_LINES_VALUES,
  PAYMENT_METHOD_VALUES,
} from '../models/Customer.js';
import serializeCustomer from '../utils/customer.serializer.js';
import { predictCustomer } from './prediction.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

const VALID_CONTRACTS = new Set(['Month-to-month', 'One year', 'Two year']);
const VALID_RISKS = new Set(['low', 'medium', 'high']);
const SORT_FIELDS = new Set([
  'customerId',
  'tenure',
  'monthlyCharges',
  'totalCharges',
  'churnRisk',
]);
const SORT_ORDERS = new Set(['asc', 'desc']);
const CREATE_CUSTOMER_FIELDS = [
  'customerId',
  'gender',
  'seniorCitizen',
  'partner',
  'dependents',
  'tenure',
  'phoneService',
  'multipleLines',
  'internetService',
  'onlineSecurity',
  'onlineBackup',
  'deviceProtection',
  'techSupport',
  'streamingTV',
  'streamingMovies',
  'contract',
  'paperlessBilling',
  'paymentMethod',
  'monthlyCharges',
  'totalCharges',
];
const CREATE_CUSTOMER_FIELD_SET = new Set(CREATE_CUSTOMER_FIELDS);
const BOOLEAN_CUSTOMER_FIELDS = [
  'seniorCitizen',
  'partner',
  'dependents',
  'phoneService',
  'paperlessBilling',
];
const INTERNET_ADD_ON_FIELDS = [
  'onlineSecurity',
  'onlineBackup',
  'deviceProtection',
  'techSupport',
  'streamingTV',
  'streamingMovies',
];

class CustomerQueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

class CustomerConflictError extends Error {
  constructor(message = 'Customer ID already exists') {
    super(message);
    this.name = 'CustomerConflictError';
    this.statusCode = 409;
  }
}

const validateCategory = (value, fieldName, allowedValues) => {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw new CustomerQueryValidationError(`Unsupported ${fieldName} value`);
  }
  return value;
};

const validateNewCustomer = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CustomerQueryValidationError('Request body must be a JSON object');
  }

  const unsupportedField = Object.keys(body).find(
    (field) => !CREATE_CUSTOMER_FIELD_SET.has(field),
  );
  if (unsupportedField) {
    throw new CustomerQueryValidationError(`Unsupported customer field: ${unsupportedField}`);
  }

  const missingField = CREATE_CUSTOMER_FIELDS.find(
    (field) => !Object.prototype.hasOwnProperty.call(body, field),
  );
  if (missingField) {
    throw new CustomerQueryValidationError(`${missingField} is required`);
  }

  if (typeof body.customerId !== 'string' || !body.customerId.trim()) {
    throw new CustomerQueryValidationError('customerId must be a non-empty string');
  }
  const customerId = body.customerId.trim();
  if (customerId.length > 50) {
    throw new CustomerQueryValidationError('customerId must not exceed 50 characters');
  }

  for (const field of BOOLEAN_CUSTOMER_FIELDS) {
    if (typeof body[field] !== 'boolean') {
      throw new CustomerQueryValidationError(`${field} must be a boolean`);
    }
  }

  if (!Number.isSafeInteger(body.tenure) || body.tenure < 0) {
    throw new CustomerQueryValidationError('tenure must be a non-negative integer');
  }
  if (
    typeof body.monthlyCharges !== 'number'
    || !Number.isFinite(body.monthlyCharges)
    || body.monthlyCharges < 0
  ) {
    throw new CustomerQueryValidationError(
      'monthlyCharges must be a finite non-negative number',
    );
  }
  if (
    body.totalCharges !== null
    && (
      typeof body.totalCharges !== 'number'
      || !Number.isFinite(body.totalCharges)
      || body.totalCharges < 0
    )
  ) {
    throw new CustomerQueryValidationError(
      'totalCharges must be null or a finite non-negative number',
    );
  }

  const customer = {
    customerId,
    gender: validateCategory(body.gender, 'gender', GENDER_VALUES),
    seniorCitizen: body.seniorCitizen,
    partner: body.partner,
    dependents: body.dependents,
    tenure: body.tenure,
    phoneService: body.phoneService,
    multipleLines: validateCategory(
      body.multipleLines,
      'multipleLines',
      MULTIPLE_LINES_VALUES,
    ),
    internetService: validateCategory(
      body.internetService,
      'internetService',
      INTERNET_SERVICE_VALUES,
    ),
    onlineSecurity: validateCategory(
      body.onlineSecurity,
      'onlineSecurity',
      INTERNET_ADD_ON_VALUES,
    ),
    onlineBackup: validateCategory(
      body.onlineBackup,
      'onlineBackup',
      INTERNET_ADD_ON_VALUES,
    ),
    deviceProtection: validateCategory(
      body.deviceProtection,
      'deviceProtection',
      INTERNET_ADD_ON_VALUES,
    ),
    techSupport: validateCategory(
      body.techSupport,
      'techSupport',
      INTERNET_ADD_ON_VALUES,
    ),
    streamingTV: validateCategory(
      body.streamingTV,
      'streamingTV',
      INTERNET_ADD_ON_VALUES,
    ),
    streamingMovies: validateCategory(
      body.streamingMovies,
      'streamingMovies',
      INTERNET_ADD_ON_VALUES,
    ),
    contract: validateCategory(body.contract, 'contract', CONTRACT_VALUES),
    paperlessBilling: body.paperlessBilling,
    paymentMethod: validateCategory(
      body.paymentMethod,
      'paymentMethod',
      PAYMENT_METHOD_VALUES,
    ),
    monthlyCharges: body.monthlyCharges,
    totalCharges: body.totalCharges,
  };

  if (
    (!customer.phoneService && customer.multipleLines !== 'No phone service')
    || (customer.phoneService && customer.multipleLines === 'No phone service')
  ) {
    throw new CustomerQueryValidationError(
      'multipleLines is inconsistent with phoneService',
    );
  }

  const expectedNoInternet = customer.internetService === 'No';
  const inconsistentInternetField = INTERNET_ADD_ON_FIELDS.find((field) => (
    expectedNoInternet
      ? customer[field] !== 'No internet service'
      : customer[field] === 'No internet service'
  ));
  if (inconsistentInternetField) {
    throw new CustomerQueryValidationError(
      `${inconsistentInternetField} is inconsistent with internetService`,
    );
  }

  return customer;
};

const createCustomer = async (body) => {
  const customerInput = validateNewCustomer(body);
  const existingCustomer = await Customer.findOne({
    where: { customerId: customerInput.customerId },
    attributes: ['id'],
  });
  if (existingCustomer) throw new CustomerConflictError();

  const prediction = await predictCustomer(customerInput);

  try {
    const customer = await Customer.create({
      ...customerInput,
      churnRisk: prediction.churnProbability,
    });
    return serializeCustomer(customer);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new CustomerConflictError();
    }
    throw error;
  }
};

const ensureSingleString = (value, parameterName) => {
  if (value === undefined) return undefined;

  if (typeof value !== 'string') {
    throw new CustomerQueryValidationError(
      `${parameterName} must be provided once as a string`,
    );
  }

  return value;
};

const parsePositiveInteger = (value, parameterName, defaultValue) => {
  const normalized = ensureSingleString(value, parameterName);
  if (normalized === undefined) return defaultValue;

  if (!/^\d+$/.test(normalized)) {
    throw new CustomerQueryValidationError(`${parameterName} must be a positive integer`);
  }

  const number = Number(normalized);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new CustomerQueryValidationError(`${parameterName} must be a positive integer`);
  }

  return number;
};

const escapeLikePattern = (value) => value.replace(/[\\%_]/g, '\\$&');

const parseListQuery = (query) => {
  const page = parsePositiveInteger(query.page, 'page', DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, 'limit', DEFAULT_LIMIT);

  if (limit > MAX_LIMIT) {
    throw new CustomerQueryValidationError(`limit must not exceed ${MAX_LIMIT}`);
  }

  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) {
    throw new CustomerQueryValidationError('page and limit produce an unsafe offset');
  }

  const searchValue = ensureSingleString(query.search, 'search');
  const search = searchValue?.trim() || undefined;
  if (search && search.length > MAX_SEARCH_LENGTH) {
    throw new CustomerQueryValidationError(
      `search must not exceed ${MAX_SEARCH_LENGTH} characters`,
    );
  }

  const contract = ensureSingleString(query.contract, 'contract');
  if (contract !== undefined && !VALID_CONTRACTS.has(contract)) {
    throw new CustomerQueryValidationError('Unsupported contract value');
  }

  const riskValue = ensureSingleString(query.risk, 'risk');
  const risk = riskValue?.toLowerCase();
  if (risk !== undefined && !VALID_RISKS.has(risk)) {
    throw new CustomerQueryValidationError('Unsupported risk value');
  }

  const sortBy = ensureSingleString(query.sortBy, 'sortBy') || 'customerId';
  if (!SORT_FIELDS.has(sortBy)) {
    throw new CustomerQueryValidationError('Unsupported sortBy value');
  }

  const sortOrderValue = ensureSingleString(query.sortOrder, 'sortOrder') || 'asc';
  const sortOrder = sortOrderValue.toLowerCase();
  if (!SORT_ORDERS.has(sortOrder)) {
    throw new CustomerQueryValidationError('sortOrder must be asc or desc');
  }

  return { page, limit, offset, search, contract, risk, sortBy, sortOrder };
};

const buildWhereClause = ({ search, contract, risk }) => {
  const where = {};

  if (search) {
    where.customerId = { [Op.iLike]: `%${escapeLikePattern(search)}%` };
  }

  if (contract) where.contract = contract;

  if (risk === 'low') {
    where.churnRisk = { [Op.lt]: 0.4 };
  } else if (risk === 'medium') {
    where.churnRisk = { [Op.gte]: 0.4, [Op.lt]: 0.7 };
  } else if (risk === 'high') {
    where.churnRisk = { [Op.gte]: 0.7 };
  }

  return where;
};

const listCustomers = async (query) => {
  const options = parseListQuery(query);
  const sortDirection = options.sortOrder.toUpperCase();
  const order = [[options.sortBy, sortDirection]];

  if (options.sortBy !== 'customerId') {
    order.push(['customerId', 'ASC']);
  }

  const { count, rows } = await Customer.findAndCountAll({
    where: buildWhereClause(options),
    order,
    limit: options.limit,
    offset: options.offset,
  });

  return {
    data: rows.map(serializeCustomer),
    pagination: {
      page: options.page,
      limit: options.limit,
      totalItems: count,
      totalPages: Math.ceil(count / options.limit),
    },
  };
};

const findCustomerByCustomerId = async (customerId) => {
  const customer = await Customer.findOne({ where: { customerId } });
  return customer ? serializeCustomer(customer) : null;
};

export {
  CREATE_CUSTOMER_FIELDS,
  CustomerConflictError,
  CustomerQueryValidationError,
  createCustomer,
  findCustomerByCustomerId,
  listCustomers,
  parseListQuery,
  validateNewCustomer,
};
