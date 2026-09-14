const { z } = require('zod');

const checkoutSchema = z.object({
  cartId: z.string().uuid('Invalid cart ID format'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'), // Mock payment method
  couponCode: z.string().optional(),
});

const validateCheckout = (data) => {
  return checkoutSchema.parse(data);
};

module.exports = {
  checkoutSchema,
  validateCheckout
};
