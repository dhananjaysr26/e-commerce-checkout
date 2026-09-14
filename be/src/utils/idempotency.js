const { IdempotencyKey } = require('../models');
const AppError = require('../errors/AppError');
const errorCodes = require('../errors/errorCodes');

/**
 * Middleware or utility to check idempotency.
 * @param {string} key 
 */
const checkIdempotency = async (key) => {
  const [record, created] = await IdempotencyKey.findOrCreate({
    where: { key },
    defaults: { status: 'started' }
  });

  if (!created) {
    if (record.status === 'completed') {
      return record.response; // Already done, return previous response
    } else if (record.status === 'started') {
      throw new AppError('Concurrent request with same idempotency key', 409, errorCodes.IDEMPOTENCY_CONFLICT);
    }
  }

  return null; // Means we can proceed
};

/**
 * Update idempotency record on success
 * @param {string} key 
 * @param {object} response 
 */
const saveIdempotencyResult = async (key, response) => {
  await IdempotencyKey.update({ status: 'completed', response }, { where: { key } });
};

module.exports = {
  checkIdempotency,
  saveIdempotencyResult
};
