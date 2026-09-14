const { z } = require('zod');

const generateCouponSchema = z.object({
  milestoneInterval: z.number().int().positive().default(5),
  discountType: z.enum(['percentage', 'fixed']).default('percentage'),
  discountValue: z.number().int().positive().default(10),
});

module.exports = {
  generateCouponSchema,
};
