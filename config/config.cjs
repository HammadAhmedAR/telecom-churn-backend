require('dotenv').config();

const createConfig = (logging = false) => ({
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging,
});

module.exports = {
  development: createConfig(console.log),
  test: createConfig(false),
  production: createConfig(false),
};
