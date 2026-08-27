import 'dotenv/config';

import { sequelize } from '../models/index.js';
import {
  getBatchInferenceConfig,
  runBatchInference,
} from '../services/batchInference.service.js';

const parseLimit = (argumentsList) => {
  if (argumentsList.length === 0) return undefined;
  if (argumentsList.length !== 1 || !argumentsList[0].startsWith('--limit=')) {
    throw new Error('Usage: npm run ml:batch -- [--limit=10]');
  }

  const limit = Number(argumentsList[0].slice('--limit='.length));
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive integer');
  }
  return limit;
};

const printSummary = (summary) => {
  console.log('');
  console.log(summary.limited ? 'Limited batch inference completed.' : 'Batch inference completed.');
  console.log(`Initial unscored customers: ${summary.initialUnscoredCustomers}`);
  console.log(`Processed: ${summary.processed}`);
  console.log(`Succeeded: ${summary.succeeded}`);
  console.log(`Failed: ${summary.failed}`);
  console.log('');
  console.log(`Total customers: ${summary.totalCustomers}`);
  console.log(`Populated churnRisk: ${summary.populatedChurnRisk}`);
  console.log(`Remaining NULL churnRisk: ${summary.remainingNullChurnRisk}`);

  if (summary.failedCustomerIds.length > 0) {
    console.log('');
    console.log('Failed customers:');
    for (const customerId of summary.failedCustomerIds) console.log(`- ${customerId}`);
    if (summary.failureIdsTruncated) console.log('- Additional failure IDs omitted');
  }
};

const main = async () => {
  const limit = parseLimit(process.argv.slice(2));
  const { batchSize, concurrency } = getBatchInferenceConfig();

  await sequelize.authenticate({ logging: false });
  console.log('Batch inference started');
  console.log(`Batch size: ${batchSize}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limit !== undefined) console.log(`Run limit: ${limit}`);

  const summary = await runBatchInference({
    batchSize,
    concurrency,
    limit,
    onProgress: (progress) => {
      console.log(
        `Processed: ${progress.processed} / ${progress.targetCustomers} | `
        + `Succeeded: ${progress.succeeded} | Failed: ${progress.failed}`,
      );
    },
    onCustomerFailure: ({ customerId, error }) => {
      console.error(`Prediction failed for ${customerId}: ${error.code || error.name}`);
    },
  });

  if (summary.targetCustomers === 0) console.log('Unscored customers: 0\nNothing to process.');
  printSummary(summary);
};

main()
  .catch((error) => {
    console.error(`Batch inference failed: ${error.message}`);
    if (error.summary) printSummary(error.summary);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
