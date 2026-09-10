require('dotenv').config();

module.exports = {
  development: {
    username: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || 'pass@123',
    database: process.env.POSTGRES_DB || 'ecommerce',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    logging: false
  },
  test: {
    username: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || 'pass@123',
    database: process.env.POSTGRES_DB_TEST || 'ecommerce_test',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    logging: false
  },
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
