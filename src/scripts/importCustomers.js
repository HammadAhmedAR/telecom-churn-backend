import 'dotenv/config';

import { resolve } from 'node:path';

import { sequelize } from '../models/index.js';
import {
  CustomerImportValidationError,
  importCustomersFromCsv,
} from '../services/customerImport.service.js';

const suppliedPath = process.argv[2] || process.env.TELCO_CSV_PATH;

const run = async () => {
  try {
    const csvPath = suppliedPath ? resolve(suppliedPath) : undefined;
    const summary = await importCustomersFromCsv(csvPath);

    console.log('\nCustomer import completed.\n');
    console.log(`CSV rows processed: ${summary.csvRowsProcessed}`);
    console.log(`Customers inserted: ${summary.customersInserted}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Invalid: ${summary.invalid}`);
    console.log(`Churn risk populated: ${summary.churnRiskPopulated}`);

    if (summary.csvRowsProcessed !== 7043) {
      console.warn(
        `Warning: expected 7043 rows for the standard IBM dataset, received ${summary.csvRowsProcessed}.`,
      );
    }
  } catch (error) {
    console.error(`Customer import failed: ${error.message}`);

    if (error instanceof CustomerImportValidationError) {
      console.error('Invalid rows (up to first 20):');
      for (const issue of error.issues.slice(0, 20)) {
        console.error(
          `- CSV row ${issue.row}, customerID ${issue.customerId ?? '<missing>'}: ${issue.reason}`,
        );
      }
    }

    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
