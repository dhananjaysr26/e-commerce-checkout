const { validateCheckout } = require('../../schemas/checkout.schema');
const checkoutService = require('../../services/checkout.service');
const { checkIdempotency, saveIdempotencyResult } = require('../../utils/idempotency');
const AppError = require('../../errors/AppError');
const errorCodes = require('../../errors/errorCodes');
const { ZodError } = require('zod');
const { success } = require('../../utils/response');
const { withAuth } = require('../../middleware/auth');
const { withErrorHandler } = require('../../middleware/errorHandler');

const checkoutHandler = async (event) => {
  const idempotencyKey = event.headers?.['x-idempotency-key'] || event.headers?.['X-Idempotency-Key'];
  if (!idempotencyKey) {
    throw new AppError('Idempotency key is required in headers', 400, errorCodes.BAD_REQUEST);
  }

  // 1. Check idempotency
  const existingResult = await checkIdempotency(idempotencyKey);
  if (existingResult) {
    return success(existingResult);
  }

  // 2. Validate input schema
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    throw new AppError('Invalid JSON body', 400, errorCodes.BAD_REQUEST);
  }

  let data;
  try {
    data = validateCheckout(body);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new AppError(e.errors[0].message, 400, errorCodes.VALIDATION_ERROR);
    }
    throw e;
  }

  const { cartId, paymentMethodId, couponCode } = data;
  const userId = event.user.userId; // Provided by withAuth wrapper

  // 3. Process Checkout
  const order = await checkoutService.processCheckout(userId, cartId, paymentMethodId, couponCode);

  const responsePayload = {
    message: 'Checkout successful',
    orderId: order.id,
    totalAmount: order.totalAmount,
    status: order.status
  };

  // 4. Save result for idempotency
  await saveIdempotencyResult(idempotencyKey, responsePayload);

  return success(responsePayload, 201);
};

// Wrap the handler with Auth and Error handling
module.exports.handler = withErrorHandler(withAuth(checkoutHandler));
