const responseUtils = require('../utils/response');

const { ZodError } = require('zod');

/**
 * Higher-order function that catches errors and formats them into API Gateway responses.
 */
const withErrorHandler = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (error) {
    if (error instanceof ZodError) {
      return responseUtils.error({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: error.issues ? error.issues[0].message : error.message
      });
    }
    return responseUtils.error(error);
  }
};

module.exports = {
  withErrorHandler
};
