const DEFAULT_JWT_EXPIRES_IN = '8h';

class AuthConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthConfigurationError';
    this.code = 'AUTH_CONFIGURATION_ERROR';
  }
}

const getJwtConfig = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new AuthConfigurationError('JWT_SECRET is not configured');
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN,
  };
};

export { AuthConfigurationError, DEFAULT_JWT_EXPIRES_IN, getJwtConfig };
