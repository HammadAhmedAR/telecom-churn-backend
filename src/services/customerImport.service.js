import { readFile } from 'node:fs/promises';

import { parse } from 'csv-parse/sync';

import { Customer, sequelize } from '../models/index.js';

const REQUIRED_COLUMNS = [
  'customerID',
  'gender',
  'SeniorCitizen',
  'Partner',
  'Dependents',
  'tenure',
  'PhoneService',
  'MultipleLines',
  'InternetService',
  'OnlineSecurity',
  'OnlineBackup',
  'DeviceProtection',
  'TechSupport',
  'StreamingTV',
  'StreamingMovies',
  'Contract',
  'PaperlessBilling',
  'PaymentMethod',
  'MonthlyCharges',
  'TotalCharges',
  'Churn',
];

const INSERT_BATCH_SIZE = 500;

const HEADER_ALIASES = {
  CustomerID: 'customerID',
  Gender: 'gender',
  'Senior Citizen': 'SeniorCitizen',
  'Tenure Months': 'tenure',
  'Phone Service': 'PhoneService',
  'Multiple Lines': 'MultipleLines',
  'Internet Service': 'InternetService',
  'Online Security': 'OnlineSecurity',
  'Online Backup': 'OnlineBackup',
  'Device Protection': 'DeviceProtection',
  'Tech Support': 'TechSupport',
  'Streaming TV': 'StreamingTV',
  'Streaming Movies': 'StreamingMovies',
  'Paperless Billing': 'PaperlessBilling',
  'Payment Method': 'PaymentMethod',
  'Monthly Charges': 'MonthlyCharges',
  'Total Charges': 'TotalCharges',
  'Churn Label': 'Churn',
};

class CustomerImportError extends Error {}

class CustomerImportValidationError extends CustomerImportError {
  constructor(issues) {
    super(`CSV validation failed for ${issues.length} row(s).`);
    this.issues = issues;
  }
}

const requireText = (value, fieldName) => {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
};

const parseYesNoBoolean = (value, fieldName) => {
  const normalized = requireText(value, fieldName).toLowerCase();

  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;

  throw new Error(`${fieldName} must be Yes or No`);
};

const parseSeniorCitizen = (value) => {
  const normalized = requireText(value, 'SeniorCitizen').toLowerCase();

  if (normalized === '1' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'no') return false;

  throw new Error('SeniorCitizen must be 0/1 or Yes/No');
};

const parseNonNegativeInteger = (value, fieldName) => {
  const normalized = requireText(value, fieldName);
  const number = Number(normalized);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return number;
};

const parseNonNegativeDecimal = (value, fieldName, { nullable = false } = {}) => {
  const normalized = String(value ?? '').trim();

  if (!normalized && nullable) return null;
  if (!normalized) throw new Error(`${fieldName} is required`);

  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number`);
  }

  return number;
};

const normalizeCustomerRow = (row) => ({
  customerId: requireText(row.customerID, 'customerID'),
  gender: requireText(row.gender, 'gender'),
  seniorCitizen: parseSeniorCitizen(row.SeniorCitizen),
  partner: parseYesNoBoolean(row.Partner, 'Partner'),
  dependents: parseYesNoBoolean(row.Dependents, 'Dependents'),
  tenure: parseNonNegativeInteger(row.tenure, 'tenure'),
  phoneService: parseYesNoBoolean(row.PhoneService, 'PhoneService'),
  multipleLines: requireText(row.MultipleLines, 'MultipleLines'),
  internetService: requireText(row.InternetService, 'InternetService'),
  onlineSecurity: requireText(row.OnlineSecurity, 'OnlineSecurity'),
  onlineBackup: requireText(row.OnlineBackup, 'OnlineBackup'),
  deviceProtection: requireText(row.DeviceProtection, 'DeviceProtection'),
  techSupport: requireText(row.TechSupport, 'TechSupport'),
  streamingTV: requireText(row.StreamingTV, 'StreamingTV'),
  streamingMovies: requireText(row.StreamingMovies, 'StreamingMovies'),
  contract: requireText(row.Contract, 'Contract'),
  paperlessBilling: parseYesNoBoolean(row.PaperlessBilling, 'PaperlessBilling'),
  paymentMethod: requireText(row.PaymentMethod, 'PaymentMethod'),
  monthlyCharges: parseNonNegativeDecimal(row.MonthlyCharges, 'MonthlyCharges'),
  totalCharges: parseNonNegativeDecimal(row.TotalCharges, 'TotalCharges', {
    nullable: true,
  }),
  churnRisk: null,
});

const parseCustomerCsv = (csvContent) => {
  let headers = [];
  let records;

  try {
    records = parse(csvContent, {
      bom: true,
      columns: (sourceHeaders) => {
        headers = sourceHeaders.map((header) => {
          const trimmedHeader = header.trim();
          return HEADER_ALIASES[trimmedHeader] || trimmedHeader;
        });
        return headers;
      },
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new CustomerImportError(`Unable to parse CSV: ${error.message}`);
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    throw new CustomerImportError(
      `CSV is missing required column(s): ${missingColumns.join(', ')}`,
    );
  }

  if (records.length === 0) {
    throw new CustomerImportError('CSV contains no customer rows.');
  }

  return records;
};

const prepareCustomerRows = async (records) => {
  const customers = [];
  const issues = [];
  const customerIds = new Set();

  for (const [index, row] of records.entries()) {
    const csvRowNumber = index + 2;

    try {
      const customer = normalizeCustomerRow(row);

      if (customerIds.has(customer.customerId)) {
        throw new Error(`duplicate customerID ${customer.customerId} in CSV`);
      }

      await Customer.build(customer).validate();
      customerIds.add(customer.customerId);
      customers.push(customer);
    } catch (error) {
      const reason = error.errors
        ? error.errors.map((validationError) => validationError.message).join('; ')
        : error.message;

      issues.push({
        row: csvRowNumber,
        customerId: String(row.customerID ?? '').trim() || null,
        reason,
      });
    }
  }

  if (issues.length > 0) {
    throw new CustomerImportValidationError(issues);
  }

  return customers;
};

const ensureCustomersTableIsEmpty = async (transaction) => {
  const customerCount = await Customer.count({ transaction, logging: false });

  if (customerCount > 0) {
    throw new CustomerImportError(
      `Import stopped: customers table already contains ${customerCount} record(s).`,
    );
  }
};

const importCustomersFromCsv = async (csvPath) => {
  if (!csvPath) {
    throw new CustomerImportError(
      'CSV path is required. Pass it as a command argument or set TELCO_CSV_PATH.',
    );
  }

  await ensureCustomersTableIsEmpty();

  let csvContent;
  try {
    csvContent = await readFile(csvPath, 'utf8');
  } catch (error) {
    throw new CustomerImportError(`Unable to read CSV at "${csvPath}": ${error.message}`);
  }

  const records = parseCustomerCsv(csvContent);
  const customers = await prepareCustomerRows(records);

  await sequelize.transaction({ logging: false }, async (transaction) => {
    await sequelize.query('LOCK TABLE "customers" IN SHARE ROW EXCLUSIVE MODE', {
      transaction,
      logging: false,
    });
    await ensureCustomersTableIsEmpty(transaction);

    for (let offset = 0; offset < customers.length; offset += INSERT_BATCH_SIZE) {
      await Customer.bulkCreate(customers.slice(offset, offset + INSERT_BATCH_SIZE), {
        transaction,
        validate: true,
        logging: false,
      });
    }
  });

  return {
    csvRowsProcessed: records.length,
    customersInserted: customers.length,
    skipped: 0,
    invalid: 0,
    churnRiskPopulated: 0,
  };
};

export {
  CustomerImportError,
  CustomerImportValidationError,
  importCustomersFromCsv,
  normalizeCustomerRow,
  parseCustomerCsv,
  prepareCustomerRows,
};
