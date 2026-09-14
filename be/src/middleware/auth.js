const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const errorCodes = require('../errors/errorCodes');
const responseUtils = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

/**
 * Higher-order function that wraps a Lambda handler with JWT authentication.
 */
const withAuth = (handler) => async (event, context) => {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // TEMPORARY CONTEXT: Default to Demo User Alice if no token is provided
      event.user = { id: '11111111-1111-1111-1111-111111111111' };
    } else {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        event.user = decoded; 
      } catch (err) {
        throw new AppError('Invalid token', 401, errorCodes.UNAUTHORIZED);
      }
    }

    // Call the actual handler
    return await handler(event, context);
  } catch (error) {
    // We catch auth errors directly here, or pass it out to be caught by withErrorHandler
    if (error instanceof AppError) {
      return responseUtils.error(error);
    }
    throw error;
  }
};

module.exports = {
  withAuth
};
