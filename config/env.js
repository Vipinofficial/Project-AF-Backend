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

module.exports = {
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
