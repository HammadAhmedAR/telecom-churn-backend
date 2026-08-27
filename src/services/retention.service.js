import { Op } from 'sequelize';

import { Customer, RetentionAction, User } from '../models/index.js';
import {
  RETENTION_ACTION_TYPES,
  RETENTION_STATUSES,
} from '../models/RetentionAction.js';
import serializeRetentionAction from '../utils/retention.serializer.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_NOTES_LENGTH = 500;
const MAX_SEARCH_LENGTH = 100;
const CREATE_FIELDS = new Set(['actionType', 'notes', 'status']);

class RetentionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RetentionValidationError';
    this.statusCode = 400;
  }
}

const ensureSingleString = (value, parameterName) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new RetentionValidationError(
      `${parameterName} must be provided once as a string`,
    );
  }
  return value;
};

const parsePositiveInteger = (value, parameterName, defaultValue) => {
  const normalized = ensureSingleString(value, parameterName);
  if (normalized === undefined) return defaultValue;
  if (!/^\d+$/.test(normalized)) {
    throw new RetentionValidationError(`${parameterName} must be a positive integer`);
  }

  const number = Number(normalized);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new RetentionValidationError(`${parameterName} must be a positive integer`);
  }
  return number;
};

const escapeLikePattern = (value) => value.replace(/[\\%_]/g, '\\$&');

const parsePagination = (query = {}) => {
  const page = parsePositiveInteger(query.page, 'page', DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, 'limit', DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) {
    throw new RetentionValidationError(`limit must not exceed ${MAX_LIMIT}`);
  }

  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) {
    throw new RetentionValidationError('page and limit produce an unsafe offset');
  }
  return { page, limit, offset };
};

const parseGlobalQuery = (query = {}) => {
  const pagination = parsePagination(query);
  const searchValue = ensureSingleString(query.search, 'search');
  const search = searchValue?.trim() || undefined;
  if (search && search.length > MAX_SEARCH_LENGTH) {
    throw new RetentionValidationError(
      `search must not exceed ${MAX_SEARCH_LENGTH} characters`,
    );
  }

  const actionType = ensureSingleString(query.actionType, 'actionType');
  if (actionType !== undefined && !RETENTION_ACTION_TYPES.includes(actionType)) {
    throw new RetentionValidationError('Unsupported actionType value');
  }

  const status = ensureSingleString(query.status, 'status');
  if (status !== undefined && !RETENTION_STATUSES.includes(status)) {
    throw new RetentionValidationError('Unsupported status value');
  }

  return { ...pagination, search, actionType, status };
};

const validateCreateInput = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RetentionValidationError('Request body must be a JSON object');
  }

  const unsupportedFields = Object.keys(body).filter((field) => !CREATE_FIELDS.has(field));
  if (unsupportedFields.length > 0) {
    throw new RetentionValidationError(`Unsupported field: ${unsupportedFields[0]}`);
  }

  if (typeof body.actionType !== 'string' || !RETENTION_ACTION_TYPES.includes(body.actionType)) {
    throw new RetentionValidationError('Unsupported actionType value');
  }

  let notes = null;
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      throw new RetentionValidationError('notes must be a string');
    }
    notes = body.notes.trim();
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new RetentionValidationError(
        `notes must not exceed ${MAX_NOTES_LENGTH} characters`,
      );
    }
  }

  const status = body.status ?? RETENTION_STATUSES[0];
  if (typeof status !== 'string' || !RETENTION_STATUSES.includes(status)) {
    throw new RetentionValidationError('Unsupported status value');
  }

  return { actionType: body.actionType, notes, status };
};

const buildRetentionIncludes = () => [
  {
    model: Customer,
    as: 'customer',
    attributes: ['customerId'],
  },
  {
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'role'],
  },
];

const createRetentionAction = async ({ telecomCustomerId, userId, body }) => {
  const customer = await Customer.findOne({
    where: { customerId: telecomCustomerId },
    attributes: ['id'],
  });
  if (!customer) return null;
  const input = validateCreateInput(body);

  const created = await RetentionAction.create({
    customerId: customer.id,
    userId,
    ...input,
  });
  const action = await RetentionAction.findByPk(created.id, {
    include: buildRetentionIncludes(),
  });
  return serializeRetentionAction(action);
};

const listCustomerRetentionActions = async (telecomCustomerId, query) => {
  const pagination = parsePagination(query);
  const customer = await Customer.findOne({
    where: { customerId: telecomCustomerId },
    attributes: ['id'],
  });
  if (!customer) return null;

  const { count, rows } = await RetentionAction.findAndCountAll({
    where: { customerId: customer.id },
    include: buildRetentionIncludes(),
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return {
    data: rows.map(serializeRetentionAction),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: Math.ceil(count / pagination.limit),
    },
  };
};

const listRetentionActions = async (query) => {
  const options = parseGlobalQuery(query);
  const where = {};
  if (options.actionType) where.actionType = options.actionType;
  if (options.status) where.status = options.status;

  const includes = buildRetentionIncludes();
  if (options.search) {
    includes[0].where = {
      customerId: { [Op.iLike]: `%${escapeLikePattern(options.search)}%` },
    };
    includes[0].required = true;
  }

  const { count, rows } = await RetentionAction.findAndCountAll({
    where,
    include: includes,
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: options.limit,
    offset: options.offset,
  });

  return {
    data: rows.map(serializeRetentionAction),
    pagination: {
      page: options.page,
      limit: options.limit,
      total: count,
      totalPages: Math.ceil(count / options.limit),
    },
  };
};

export {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MAX_NOTES_LENGTH,
  RETENTION_STATUSES,
  RetentionValidationError,
  createRetentionAction,
  listCustomerRetentionActions,
  listRetentionActions,
  parseGlobalQuery,
  parsePagination,
  validateCreateInput,
};
