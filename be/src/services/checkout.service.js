const { sequelize, Cart, CartItem, Product, Order, OrderItem, Coupon, User } = require('../models');
const AppError = require('../errors/AppError');
const errorCodes = require('../errors/errorCodes');

class CheckoutService {
  async processCheckout(userId, cartId, paymentMethodId, couponCode = null) {
    // We use Read Committed (default in Postgres) but rely on row-level locks / optimistic concurrency
    // Alternatively, SERIALIZABLE isolation level for the whole transaction.
    // For this, we'll use an explicit transaction.
    const t = await sequelize.transaction();

    try {
      // 1. Fetch Cart
      const cart = await Cart.findOne({
        where: { id: cartId, userId, status: 'active' },
        include: [{ model: CartItem, include: [Product] }],
        transaction: t,
        lock: t.LOCK.UPDATE // Lock cart to prevent concurrent checkouts
      });

      if (!cart) {
        throw new AppError('Active cart not found', 404, errorCodes.NOT_FOUND);
      }
      
      if (cart.CartItems.length === 0) {
        throw new AppError('Cart is empty', 400, errorCodes.BAD_REQUEST);
      }

      let subtotal = 0;
      const orderItems = [];

      // 2. Validate Inventory and Calculate Subtotal
      for (const item of cart.CartItems) {
        // Find product with lock to ensure inventory isn't changed concurrently
        const product = await Product.findByPk(item.productId, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!product || product.inventory < item.quantity) {
          throw new AppError(`Insufficient inventory for product: ${item.Product.name}`, 409, errorCodes.INSUFFICIENT_INVENTORY);
        }

        subtotal += product.price * item.quantity;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtPurchase: product.price
        });

        // Deduct inventory
        await product.decrement('inventory', { by: item.quantity, transaction: t });
      }

      // 3. Apply Coupon if any
      let discount = 0;
      let appliedCouponId = null;

      if (couponCode) {
        const coupon = await Coupon.findOne({
          where: { code: couponCode, isActive: true },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!coupon) {
          throw new AppError('Invalid or expired coupon', 400, errorCodes.BAD_REQUEST);
        }

        if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
          throw new AppError('Coupon usage limit reached', 400, errorCodes.BAD_REQUEST);
        }

        if (coupon.discountType === 'percentage') {
          discount = Math.floor((subtotal * coupon.discountValue) / 100);
        } else if (coupon.discountType === 'fixed') {
          discount = coupon.discountValue;
        }

        // Apply coupon usage
        await coupon.increment('currentUses', { by: 1, transaction: t });
        appliedCouponId = coupon.id;
      }

      const totalAmount = Math.max(0, subtotal - discount);

      // 4. Create Order
      const order = await Order.create({
        userId,
        totalAmount,
        status: 'paid', // Mocking instant payment success
        appliedCouponId
      }, { transaction: t });

      // Add order items
      const orderItemsData = orderItems.map(oi => ({ ...oi, orderId: order.id }));
      await OrderItem.bulkCreate(orderItemsData, { transaction: t });

      // 5. Update Cart status
      cart.status = 'converted';
      await cart.save({ transaction: t });

      // 6. Rewards Logic
      // 1 reward point for every 100 cents (1 dollar) spent
      const pointsEarned = Math.floor(totalAmount / 100);
      if (pointsEarned > 0) {
        const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        await user.increment('rewardPoints', { by: pointsEarned, transaction: t });
      }

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new CheckoutService();
