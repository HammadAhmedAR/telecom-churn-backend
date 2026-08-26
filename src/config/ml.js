const DEFAULT_ML_REQUEST_TIMEOUT_MS = 5000;

const getMlServiceConfig = () => {
  const configuredUrl = process.env.ML_SERVICE_URL?.trim();

  if (!configuredUrl) {
    const error = new Error('ML_SERVICE_URL is not configured');
    error.code = 'ML_CONFIGURATION_ERROR';
    throw error;
  }

  let baseUrl;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    const error = new Error('ML_SERVICE_URL must be a valid URL');
    error.code = 'ML_CONFIGURATION_ERROR';
    throw error;
  }

  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    const error = new Error('ML_SERVICE_URL must use http or https');
    error.code = 'ML_CONFIGURATION_ERROR';
    throw error;
  }

  const configuredTimeout = process.env.ML_REQUEST_TIMEOUT_MS?.trim();
  const timeoutMs = configuredTimeout
    ? Number(configuredTimeout)
    : DEFAULT_ML_REQUEST_TIMEOUT_MS;

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    const error = new Error('ML_REQUEST_TIMEOUT_MS must be a positive integer');
    error.code = 'ML_CONFIGURATION_ERROR';
    throw error;
  }

  return {
    baseUrl: baseUrl.toString(),
    timeoutMs,
  };
};

export { DEFAULT_ML_REQUEST_TIMEOUT_MS, getMlServiceConfig };
