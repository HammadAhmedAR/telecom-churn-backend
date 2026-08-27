import assert from 'node:assert/strict';

import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  getBatchInferenceConfig,
} from '../services/batchInference.service.js';
import { validatePredictionResponse } from '../services/mlClient.service.js';
import {
  ML_PAYLOAD_FIELDS,
  mapCustomerToMlPayload,
} from '../utils/mlPayload.mapper.js';
import getRiskLevel from '../utils/riskLevel.js';

const customer = {
  customerId: 'TEST-ID',
  tenure: 12,
  monthlyCharges: '70.25',
  totalCharges: null,
  gender: 'Female',
  seniorCitizen: false,
  partner: true,
  dependents: false,
  phoneService: true,
  multipleLines: 'No',
  internetService: 'DSL',
  onlineSecurity: 'No',
  onlineBackup: 'Yes',
  deviceProtection: 'No',
  techSupport: 'No',
  streamingTV: 'No',
  streamingMovies: 'No',
  contract: 'Month-to-month',
  paperlessBilling: true,
  paymentMethod: 'Electronic check',
  churnRisk: null,
};

const payload = mapCustomerToMlPayload(customer);
assert.deepEqual(Object.keys(payload), ML_PAYLOAD_FIELDS);
assert.equal(Object.keys(payload).length, 19);
assert.equal(payload.customerId, undefined);
assert.equal(payload.churnRisk, undefined);
assert.equal(payload.senior_citizen, 'No');
assert.equal(payload.partner, 'Yes');
assert.equal(payload.total_charges, null);
assert.equal(typeof payload.monthly_charges, 'number');

const riskBoundaries = new Map([
  [0, 'LOW'],
  [0.39, 'LOW'],
  [0.4, 'MEDIUM'],
  [0.69, 'MEDIUM'],
  [0.7, 'HIGH'],
  [1, 'HIGH'],
]);
for (const [probability, expected] of riskBoundaries) {
  assert.equal(getRiskLevel(probability), expected);
}

const validResponse = {
  prediction: 1,
  label: 'churn',
  churn_probability: 0.6,
  model: 'XGBoost',
};
assert.equal(validatePredictionResponse(validResponse), validResponse);
for (const invalidProbability of [null, undefined, Number.NaN, Infinity, -0.1, 1.2]) {
  assert.throws(
    () => validatePredictionResponse({
      ...validResponse,
      churn_probability: invalidProbability,
    }),
    { code: 'ML_SERVICE_INVALID_RESPONSE' },
  );
}

assert.deepEqual(getBatchInferenceConfig({}), {
  batchSize: DEFAULT_BATCH_SIZE,
  concurrency: DEFAULT_CONCURRENCY,
});
assert.deepEqual(getBatchInferenceConfig({
  ML_BATCH_SIZE: '25',
  ML_BATCH_CONCURRENCY: '3',
}), {
  batchSize: 25,
  concurrency: 3,
});
assert.throws(
  () => getBatchInferenceConfig({ ML_BATCH_CONCURRENCY: '0' }),
  { code: 'BATCH_INFERENCE_CONFIGURATION_ERROR' },
);

console.log('ML boundary validation passed.');
