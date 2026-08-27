import { Op } from 'sequelize';

import { Customer } from '../models/index.js';
import { checkMlHealth } from './mlClient.service.js';
import { predictCustomer } from './prediction.service.js';

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY = 5;
const MAX_BATCH_SIZE = 1000;
const MAX_CONCURRENCY = 50;
const FAILURE_ID_REPORT_LIMIT = 50;

class BatchInferenceConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BatchInferenceConfigurationError';
    this.code = 'BATCH_INFERENCE_CONFIGURATION_ERROR';
  }
}

class BatchInferenceStoppedError extends Error {
  constructor(message, summary, options = {}) {
    super(message, options);
    this.name = 'BatchInferenceStoppedError';
    this.code = 'BATCH_INFERENCE_STOPPED';
    this.summary = summary;
  }
}

const parsePositiveInteger = (value, name, defaultValue, maximum) => {
  if (value === undefined || value === null || value === '') return defaultValue;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum && parsed > maximum)) {
    const maximumMessage = maximum ? ` and at most ${maximum}` : '';
    throw new BatchInferenceConfigurationError(
      `${name} must be a positive integer${maximumMessage}`,
    );
  }

  return parsed;
};

const getBatchInferenceConfig = (environment = process.env) => ({
  batchSize: parsePositiveInteger(
    environment.ML_BATCH_SIZE,
    'ML_BATCH_SIZE',
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
  ),
  concurrency: parsePositiveInteger(
    environment.ML_BATCH_CONCURRENCY,
    'ML_BATCH_CONCURRENCY',
    DEFAULT_CONCURRENCY,
    MAX_CONCURRENCY,
  ),
});

const isSystemicMlFailure = (error) => new Set([
  'ML_CONFIGURATION_ERROR',
  'ML_SERVICE_TIMEOUT',
  'ML_SERVICE_UNAVAILABLE',
]).has(error?.code);

const ensurePersistableProbability = (probability) => {
  if (
    typeof probability !== 'number'
    || !Number.isFinite(probability)
    || probability < 0
    || probability > 1
  ) {
    throw new TypeError('Prediction returned an invalid churn probability');
  }
};

const getRiskPopulationStats = async () => {
  const [totalCustomers, populatedChurnRisk, remainingNullChurnRisk] = await Promise.all([
    Customer.count({ logging: false }),
    Customer.count({
      where: { churnRisk: { [Op.not]: null } },
      logging: false,
    }),
    Customer.count({
      where: { churnRisk: { [Op.is]: null } },
      logging: false,
    }),
  ]);

  return { totalCustomers, populatedChurnRisk, remainingNullChurnRisk };
};

const runBatchInference = async ({
  batchSize = DEFAULT_BATCH_SIZE,
  concurrency = DEFAULT_CONCURRENCY,
  limit,
  onProgress = () => {},
  onCustomerFailure = () => {},
} = {}) => {
  const normalizedBatchSize = parsePositiveInteger(
    batchSize,
    'batchSize',
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
  );
  const normalizedConcurrency = parsePositiveInteger(
    concurrency,
    'concurrency',
    DEFAULT_CONCURRENCY,
    MAX_CONCURRENCY,
  );
  const normalizedLimit = limit === undefined
    ? undefined
    : parsePositiveInteger(limit, 'limit');

  const initialUnscoredCustomers = await Customer.count({
    where: { churnRisk: { [Op.is]: null } },
    logging: false,
  });
  const targetCustomers = Math.min(
    initialUnscoredCustomers,
    normalizedLimit ?? initialUnscoredCustomers,
  );
  const summary = {
    initialUnscoredCustomers,
    targetCustomers,
    processed: 0,
    succeeded: 0,
    failed: 0,
    failedCustomerIds: [],
    failureIdsTruncated: false,
    limited: normalizedLimit !== undefined,
  };

  if (targetCustomers === 0) {
    return { ...summary, ...(await getRiskPopulationStats()) };
  }

  await checkMlHealth();

  let cursorId = 0;
  let systemicFailure;

  while (summary.processed < targetCustomers && !systemicFailure) {
    const remainingTarget = targetCustomers - summary.processed;
    const customers = await Customer.findAll({
      where: {
        churnRisk: { [Op.is]: null },
        id: { [Op.gt]: cursorId },
      },
      order: [['id', 'ASC']],
      limit: Math.min(normalizedBatchSize, remainingTarget),
      logging: false,
    });

    if (customers.length === 0) break;
    cursorId = customers.at(-1).id;

    let nextIndex = 0;
    const worker = async () => {
      while (!systemicFailure) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= customers.length) return;

        const customer = customers[index];
        try {
          const prediction = await predictCustomer(customer);
          ensurePersistableProbability(prediction.churnProbability);

          const [updatedRows] = await Customer.update(
            { churnRisk: prediction.churnProbability },
            {
              where: {
                id: customer.id,
                churnRisk: { [Op.is]: null },
              },
              logging: false,
            },
          );

          if (updatedRows !== 1) {
            throw new Error('Customer was not updated because churnRisk is no longer NULL');
          }

          summary.succeeded += 1;
        } catch (error) {
          summary.failed += 1;
          if (summary.failedCustomerIds.length < FAILURE_ID_REPORT_LIMIT) {
            summary.failedCustomerIds.push(customer.customerId);
          } else {
            summary.failureIdsTruncated = true;
          }
          onCustomerFailure({ customerId: customer.customerId, error });

          if (isSystemicMlFailure(error)) systemicFailure = error;
        } finally {
          summary.processed += 1;
        }
      }
    };

    const workerCount = Math.min(normalizedConcurrency, customers.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    onProgress({ ...summary });
  }

  const completedSummary = { ...summary, ...(await getRiskPopulationStats()) };
  if (systemicFailure) {
    throw new BatchInferenceStoppedError(
      'Batch inference stopped because the ML service became unavailable',
      completedSummary,
      { cause: systemicFailure },
    );
  }

  return completedSummary;
};

export {
  BatchInferenceConfigurationError,
  BatchInferenceStoppedError,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  getBatchInferenceConfig,
  getRiskPopulationStats,
  runBatchInference,
};
