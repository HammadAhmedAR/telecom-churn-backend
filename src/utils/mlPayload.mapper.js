const ML_PAYLOAD_FIELDS = [
  'tenure_months',
  'monthly_charges',
  'total_charges',
  'gender',
  'senior_citizen',
  'partner',
  'dependents',
  'phone_service',
  'multiple_lines',
  'internet_service',
  'online_security',
  'online_backup',
  'device_protection',
  'tech_support',
  'streaming_tv',
  'streaming_movies',
  'contract',
  'paperless_billing',
  'payment_method',
];

class MlPayloadMappingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MlPayloadMappingError';
    this.code = 'ML_PAYLOAD_MAPPING_ERROR';
  }
}

const toYesNo = (value, fieldName) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  throw new MlPayloadMappingError(`${fieldName} must be a boolean`);
};

const toFiniteNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new MlPayloadMappingError(`${fieldName} must be a finite number`);
  }
  return number;
};

const mapCustomerToMlPayload = (customer) => {
  const source = typeof customer?.get === 'function'
    ? customer.get({ plain: true })
    : customer;

  if (!source) {
    throw new MlPayloadMappingError('Customer is required');
  }

  const tenureMonths = toFiniteNumber(source.tenure, 'tenure');
  if (!Number.isInteger(tenureMonths) || tenureMonths < 0) {
    throw new MlPayloadMappingError('tenure must be a non-negative integer');
  }

  return {
    tenure_months: tenureMonths,
    monthly_charges: toFiniteNumber(source.monthlyCharges, 'monthlyCharges'),
    total_charges: source.totalCharges === null
      ? null
      : toFiniteNumber(source.totalCharges, 'totalCharges'),
    gender: source.gender,
    senior_citizen: toYesNo(source.seniorCitizen, 'seniorCitizen'),
    partner: toYesNo(source.partner, 'partner'),
    dependents: toYesNo(source.dependents, 'dependents'),
    phone_service: toYesNo(source.phoneService, 'phoneService'),
    multiple_lines: source.multipleLines,
    internet_service: source.internetService,
    online_security: source.onlineSecurity,
    online_backup: source.onlineBackup,
    device_protection: source.deviceProtection,
    tech_support: source.techSupport,
    streaming_tv: source.streamingTV,
    streaming_movies: source.streamingMovies,
    contract: source.contract,
    paperless_billing: toYesNo(source.paperlessBilling, 'paperlessBilling'),
    payment_method: source.paymentMethod,
  };
};

export { ML_PAYLOAD_FIELDS, MlPayloadMappingError, mapCustomerToMlPayload };
