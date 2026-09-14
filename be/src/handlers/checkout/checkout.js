const { validateCheckout } = require('../../schemas/checkout.schema');
const checkoutService = require('../../services/checkout.service');
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

  const { cartId } = event.pathParameters || {};
  const userId = event.user.id; // Corrected to event.user.id

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

  const { paymentMethodId, couponCode } = data;
  const requestHash = require('crypto').createHash('sha256').update(JSON.stringify({ cartId, paymentMethodId, couponCode })).digest('hex');

  // 3. Process Checkout
  const order = await checkoutService.processCheckout(userId, cartId, paymentMethodId, couponCode, idempotencyKey, requestHash);

  const responsePayload = {
    message: 'Checkout successful',
    orderId: order.id,
    netAmountMinor: order.netAmountMinor,
    status: order.status
  };

  return success({ data: responsePayload }, 201);
};

// Wrap the handler with Auth and Error handling
module.exports.handler = withErrorHandler(withAuth(checkoutHandler));
