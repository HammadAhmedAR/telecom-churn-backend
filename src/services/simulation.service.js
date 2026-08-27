import { Customer } from '../models/index.js';
import {
  CONTRACT_VALUES,
  INTERNET_ADD_ON_VALUES,
} from '../models/Customer.js';
import getRiskLevel from '../utils/riskLevel.js';
import { predictCustomer } from './prediction.service.js';

const SIMULATION_FIELDS = [
  'contract',
  'monthlyCharges',
  'techSupport',
  'onlineSecurity',
];
const SIMULATION_FIELD_SET = new Set(SIMULATION_FIELDS);

class SimulationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SimulationValidationError';
    this.statusCode = 400;
  }
}

const validateCategory = (value, fieldName, allowedValues) => {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw new SimulationValidationError(`Unsupported ${fieldName} value`);
  }
  return value;
};

const validateSimulationOverrides = (body, customer) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SimulationValidationError('Request body must be a JSON object');
  }

  const fields = Object.keys(body);
  if (fields.length === 0) {
    throw new SimulationValidationError('At least one simulation override is required');
  }

  const unsupportedField = fields.find((field) => !SIMULATION_FIELD_SET.has(field));
  if (unsupportedField) {
    throw new SimulationValidationError(`Unsupported simulation field: ${unsupportedField}`);
  }

  const overrides = {};
  if (body.contract !== undefined) {
    overrides.contract = validateCategory(body.contract, 'contract', CONTRACT_VALUES);
  }

  if (body.monthlyCharges !== undefined) {
    if (
      typeof body.monthlyCharges !== 'number'
      || !Number.isFinite(body.monthlyCharges)
      || body.monthlyCharges < 0
    ) {
      throw new SimulationValidationError(
        'monthlyCharges must be a finite non-negative number',
      );
    }
    overrides.monthlyCharges = body.monthlyCharges;
  }

  for (const field of ['techSupport', 'onlineSecurity']) {
    if (body[field] === undefined) continue;
    const value = validateCategory(body[field], field, INTERNET_ADD_ON_VALUES);

    if (customer.internetService === 'No' && value !== 'No internet service') {
      throw new SimulationValidationError(
        `${field} must be No internet service when internetService is No`,
      );
    }
    if (customer.internetService !== 'No' && value === 'No internet service') {
      throw new SimulationValidationError(
        `${field} cannot be No internet service when internetService is available`,
      );
    }
    overrides[field] = value;
  }

  const hasEffectiveChange = Object.entries(overrides).some(([field, value]) => {
    const actualValue = field === 'monthlyCharges'
      ? Number(customer[field])
      : customer[field];
    return actualValue !== value;
  });
  if (!hasEffectiveChange) {
    throw new SimulationValidationError(
      'At least one effective simulation change is required',
    );
  }

  return overrides;
};

const simulateCustomerByCustomerId = async (customerId, body) => {
  const customer = await Customer.findOne({ where: { customerId } });
  if (!customer) return null;

  const actualCustomer = customer.get({ plain: true });
  if (actualCustomer.churnRisk === null) {
    throw new SimulationValidationError('Customer does not have a baseline churn risk');
  }
  const overrides = validateSimulationOverrides(body, actualCustomer);
  const simulatedCustomer = { ...actualCustomer, ...overrides };
  const prediction = await predictCustomer(simulatedCustomer);
  const baselineChurnRisk = Number(actualCustomer.churnRisk);

  return {
    customerId: actualCustomer.customerId,
    baseline: {
      churnRisk: baselineChurnRisk,
      riskLevel: getRiskLevel(baselineChurnRisk),
    },
    simulation: {
      churnRisk: prediction.churnProbability,
      riskLevel: prediction.riskLevel,
    },
    riskChange: prediction.churnProbability - baselineChurnRisk,
    overrides,
    model: prediction.model,
  };
};

export {
  SIMULATION_FIELDS,
  SimulationValidationError,
  simulateCustomerByCustomerId,
  validateSimulationOverrides,
};
