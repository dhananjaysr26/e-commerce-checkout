const { withAuth } = require('../../middleware/auth');
const { withErrorHandler } = require('../../middleware/errorHandler');
const { success } = require('../../utils/response');
const { RewardAccount, RewardEvent, Coupon } = require('../../models');

const getRewards = async (event) => {
  const userId = event.user.id;

  const account = await RewardAccount.findOne({
    where: { userId },
    attributes: ['successfulOrderCount', 'updatedAt']
  });

  const events = await RewardEvent.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    attributes: ['orderId', 'eventType', 'milestone', 'createdAt']
  });

  return success({
    data: {
      progress: account ? account.successfulOrderCount : 0,
      history: events
    }
  });
};

const getCoupons = async (event) => {
  const userId = event.user.id;
  const coupons = await Coupon.findAll({
    where: { userId, status: 'available' },
    order: [['createdAt', 'DESC']]
  });

  return success({ data: coupons });
};

module.exports = {
  getRewards: withErrorHandler(withAuth(getRewards)),
  getCoupons: withErrorHandler(withAuth(getCoupons)),
};
