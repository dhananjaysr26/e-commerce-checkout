const adminService = require('../../services/admin.service');
const { generateCouponSchema } = require('../../schemas/admin.schema');
const { success } = require('../../utils/response');
const { withErrorHandler } = require('../../middleware/errorHandler');
const { withAuth } = require('../../middleware/auth');
const AppError = require('../../errors/AppError');

const generateCoupon = async (event) => {
  if (event.user.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN_ACCESS');
  }

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      throw new AppError('Invalid JSON body', 400, 'BAD_REQUEST');
    }
  }

  const data = generateCouponSchema.parse(body);

  const result = await adminService.generateCoupon(
    data.milestoneInterval,
    data.discountType,
    data.discountValue
  );

  return success(result, 200);
};

const getReport = async (event) => {
  if (event.user.role !== 'admin') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN_ACCESS');
  }

  const report = await adminService.getReport();
  return success(report, 200);
};

module.exports = {
  generateCoupon: withErrorHandler(withAuth(generateCoupon)),
  getReport: withErrorHandler(withAuth(getReport))
};
