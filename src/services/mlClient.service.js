import { getMlServiceConfig } from '../config/ml.js';

class MlClientError extends Error {
  constructor(message, code, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class MlConfigurationError extends MlClientError {
  constructor(message, options) {
    super(message, 'ML_CONFIGURATION_ERROR', options);
  }
}

class MlServiceUnavailableError extends MlClientError {
  constructor(message = 'ML service is unavailable', { status, cause } = {}) {
    super(message, 'ML_SERVICE_UNAVAILABLE', { cause });
    this.status = status;
  }
}

class MlServiceTimeoutError extends MlClientError {
  constructor(timeoutMs, options) {
    super(
      `ML service request timed out after ${timeoutMs} ms`,
      'ML_SERVICE_TIMEOUT',
      options,
    );
    this.timeoutMs = timeoutMs;
  }
}

class MlServiceRequestError extends MlClientError {
  constructor(status) {
    super(`ML service rejected the request with HTTP ${status}`, 'ML_SERVICE_REQUEST_ERROR');
    this.status = status;
  }
}

class MlServiceInvalidResponseError extends MlClientError {
  constructor(message = 'ML service returned an invalid JSON response', options) {
    super(message, 'ML_SERVICE_INVALID_RESPONSE', options);
  }
}

const readConfig = () => {
  try {
    return getMlServiceConfig();
  } catch (error) {
    throw new MlConfigurationError(error.message, { cause: error });
  }
};

const buildRequestUrl = (baseUrl, path) => {
  if (typeof path !== 'string' || !path.trim()) {
    throw new MlConfigurationError('ML request path must be a non-empty string');
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return new URL(normalizedPath, normalizedBaseUrl);
};

const requestMlJson = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const { baseUrl, timeoutMs } = readConfig();
  const requestUrl = buildRequestUrl(baseUrl, path);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  let serializedBody;

  try {
    serializedBody = body === undefined ? undefined : JSON.stringify(body);
  } catch (error) {
    clearTimeout(timeout);
    throw new MlConfigurationError('ML request body must be JSON-serializable', {
      cause: error,
    });
  }

  let response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: serializedBody,
      signal: abortController.signal,
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new MlServiceTimeoutError(timeoutMs, { cause: error });
    }

    throw new MlServiceUnavailableError('Unable to connect to ML service', {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new MlServiceRequestError(response.status);
    }

    throw new MlServiceUnavailableError('ML service returned a server error', {
      status: response.status,
    });
  }

  let responseText;
  try {
    responseText = await response.text();
  } catch (error) {
    throw new MlServiceInvalidResponseError('Unable to read ML service response', {
      cause: error,
    });
  }
  if (!responseText) {
    throw new MlServiceInvalidResponseError('ML service returned an empty response');
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new MlServiceInvalidResponseError(undefined, { cause: error });
  }
};

const checkMlHealth = async () => {
  const response = await requestMlJson('/health');

  if (
    !response
    || typeof response !== 'object'
    || response.status !== 'ok'
    || typeof response.model_loaded !== 'boolean'
  ) {
    throw new MlServiceInvalidResponseError('ML service returned an invalid health response');
  }

  if (response.model_loaded !== true) {
    throw new MlServiceUnavailableError('ML service model is not loaded');
  }

  return response;
};

const validatePredictionResponse = (response) => {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new MlServiceInvalidResponseError('ML service returned an invalid prediction response');
  }

  if (response.prediction !== 0 && response.prediction !== 1) {
    throw new MlServiceInvalidResponseError('ML prediction must be 0 or 1');
  }

  if (typeof response.label !== 'string' || !response.label.trim()) {
    throw new MlServiceInvalidResponseError('ML prediction label must be a non-empty string');
  }

  if (
    typeof response.churn_probability !== 'number'
    || !Number.isFinite(response.churn_probability)
    || response.churn_probability < 0
    || response.churn_probability > 1
  ) {
    throw new MlServiceInvalidResponseError(
      'ML churn probability must be a finite number between 0 and 1',
    );
  }

  if (typeof response.model !== 'string' || !response.model.trim()) {
    throw new MlServiceInvalidResponseError('ML model name must be a non-empty string');
  }

  return response;
};

const predictCustomer = async (payload) => {
  const response = await requestMlJson('/predict', {
    method: 'POST',
    body: payload,
  });
  return validatePredictionResponse(response);
};

export {
  MlClientError,
  MlConfigurationError,
  MlServiceInvalidResponseError,
  MlServiceRequestError,
  MlServiceTimeoutError,
  MlServiceUnavailableError,
  checkMlHealth,
  predictCustomer,
  requestMlJson,
  validatePredictionResponse,
};
