/**
 * Formats a successful API Gateway response
 */
const success = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};

/**
 * Formats an error API Gateway response
 */
const error = (err) => {
  console.error('Lambda Error:', err);
  
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Internal server error';

  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: {
        code: errorCode,
        message: message,
      }
    }),
  };
};

module.exports = {
  success,
  error
};
