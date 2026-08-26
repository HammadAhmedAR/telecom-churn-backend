import { Op } from 'sequelize';

import { Customer } from '../models/index.js';
import serializeCustomer from '../utils/customer.serializer.js';

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

class CustomerQueryValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

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
  CustomerQueryValidationError,
  findCustomerByCustomerId,
  listCustomers,
  parseListQuery,
};
