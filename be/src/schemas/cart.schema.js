const { z } = require('zod');

const addCartItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID' }),
  quantity: z.number().int().positive({ message: 'Quantity must be a positive integer' }),
});

module.exports = {
  addCartItemSchema,
};
