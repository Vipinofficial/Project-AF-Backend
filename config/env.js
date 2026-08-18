require('dotenv').config();

// Fail fast and loudly at boot rather than silently falling back to a baked-in
// value. A missing DATABASE_URL should stop the process, not quietly connect
// somewhere unexpected.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `Copy .env.example to .env and fill in the real values.`
    );
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT) || 5000,
  // Containers must bind every interface or the platform's health check and
  // router cannot reach the process.
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  /**
   * Comma-separated list of origins allowed to call this API.
   * Empty in development means "allow any", which is convenient locally and
   * unacceptable in production - see index.js.
   */
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
