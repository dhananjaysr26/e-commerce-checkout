const { sequelize, Order, OrderItem, Product, Coupon } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

class AdminService {
  async generateCoupon(milestoneInterval, discountType, discountValue) {
    const totalOrders = await Order.count({ where: { status: 'paid' } });
    const maxEligible = Math.floor(totalOrders / milestoneInterval) * milestoneInterval;

    if (maxEligible === 0) {
      return { generated: false, message: 'No eligible milestone yet' };
    }

    const maxGeneratedCoupon = await Coupon.max('milestone');
    const currentMax = maxGeneratedCoupon || 0;
    const nextMilestone = currentMax + milestoneInterval;

    if (nextMilestone > maxEligible) {
      return { generated: false, message: 'All eligible milestones already have generated coupons' };
    }

    const code = `MILESTONE-${nextMilestone}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      milestone: nextMilestone,
      status: 'available',
      isActive: true,
      maxUses: 1, // Optional since we use status available/redeemed
      currentUses: 0
    });

    return { generated: true, coupon };
  }

  async getReport() {
    // Total successfully placed orders
    const totalOrders = await Order.count({ where: { status: 'paid' } });

    // Revenue metrics
    const revenueRows = await Order.findAll({
      where: { status: 'paid' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('gross_amount_minor')), 'totalGross'],
        [sequelize.fn('SUM', sequelize.col('discount_amount_minor')), 'totalDiscount'],
        [sequelize.fn('SUM', sequelize.col('net_amount_minor')), 'totalNet']
      ],
      raw: true
    });

    const revenue = revenueRows[0] || {};
    const grossRevenue = parseInt(revenue.totalGross || 0, 10);
    const totalDiscounts = parseInt(revenue.totalDiscount || 0, 10);
    const netRevenue = parseInt(revenue.totalNet || 0, 10);

    // Purchased quantity grouped by product
    const productStats = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      include: [
        {
          model: Order,
          attributes: [],
          where: { status: 'paid' }
        }
      ],
      group: ['productId'],
      raw: true
    });

    // Coupon metrics
    const couponsGenerated = await Coupon.count({ where: { milestone: { [Op.not]: null } } });
    const couponsAvailable = await Coupon.count({ where: { status: 'available' } });
    const couponsRedeemed = await Coupon.count({ where: { status: 'redeemed' } });

    return {
      totalOrders,
      grossRevenue,
      totalDiscounts,
      netRevenue,
      productQuantities: productStats.map(stat => ({
        productId: stat.productId,
        quantity: parseInt(stat.totalQuantity, 10)
      })),
      coupons: {
        generated: couponsGenerated,
        available: couponsAvailable,
        redeemed: couponsRedeemed
      }
    };
  }
}

module.exports = new AdminService();
