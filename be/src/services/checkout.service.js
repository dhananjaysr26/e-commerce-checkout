const { sequelize, Cart, CartItem, Product, Order, OrderItem, Coupon, IdempotencyKey, User, RewardAccount, RewardEvent } = require('../models');
const AppError = require('../errors/AppError');
const errorCodes = require('../errors/errorCodes');
const crypto = require('crypto');

class CheckoutService {
  async processCheckout(userId, cartId, paymentMethodId, couponCode, idempotencyKey, requestHash) {
    // 1. Check idempotency outside transaction to avoid blocking everything on reads, but handle concurrency safely
    const existing = await IdempotencyKey.findOne({ where: { userId, key: idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError('Idempotency key reused with different request', 409, 'IDEMPOTENCY_KEY_REUSED');
      }
      if (existing.status === 'completed' && existing.orderId) {
        const existingOrder = await Order.findByPk(existing.orderId);
        return existingOrder;
      }
      if (existing.status === 'started') {
        throw new AppError('Concurrent request with same idempotency key in progress', 409, errorCodes.IDEMPOTENCY_CONFLICT);
      }
      // If failed, we allow retry
    }

    // Begin transaction
    const t = await sequelize.transaction();

    try {
      // 3. Fetch Cart First to avoid deadlock on foreign key locks (IdempotencyKey -> Cart)
      const cart = await Cart.findOne({
        where: { id: cartId, userId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!cart) {
        throw new AppError('Cart not found', 404, errorCodes.NOT_FOUND);
      }
      if (cart.status !== 'open') {
        throw new AppError('Cart is already checked out', 409, 'CART_ALREADY_CHECKED_OUT');
      }

      // 2. Insert/Update Idempotency Record (starts processing)
      if (!existing) {
        try {
          await IdempotencyKey.create({
            userId, cartId, key: idempotencyKey, requestHash, status: 'started'
          }, { transaction: t });
        } catch (err) {
          if (err.name === 'SequelizeUniqueConstraintError') {
            throw new AppError('Concurrent request with same idempotency key in progress', 409, errorCodes.IDEMPOTENCY_CONFLICT);
          }
          throw err;
        }
      } else if (existing.status === 'failed') {
        await existing.update({ status: 'started', cartId, requestHash }, { transaction: t });
      }

      const cartItems = await CartItem.findAll({
        where: { cartId },
        include: [Product],
        transaction: t
      });
      
      if (cartItems.length === 0) {
        throw new AppError('Cart is empty', 422, errorCodes.BAD_REQUEST);
      }
      cart.CartItems = cartItems;

      let grossAmountMinor = 0;
      const orderItemsData = [];

      // 4. Validate Inventory and Deduct
      for (const item of cart.CartItems) {
        const product = item.Product;

        // Atomic inventory update
        const [results, metadata] = await sequelize.query(`
          UPDATE products
          SET inventory = inventory - :quantity
          WHERE id = :productId AND inventory >= :quantity
        `, {
          replacements: { quantity: item.quantity, productId: product.id },
          transaction: t,
        });

        if (!metadata || metadata.rowCount === 0) {
          throw new AppError(`Insufficient inventory for product: ${product.name}`, 422, 'INSUFFICIENT_INVENTORY');
        }

        const lineTotalMinor = product.unitPriceMinor * item.quantity;
        grossAmountMinor += lineTotalMinor;
        
        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPriceMinor: product.unitPriceMinor,
          lineTotalMinor: lineTotalMinor
        });
      }

      // 5. Apply Coupon
      let discountAmountMinor = 0;
      let appliedCouponId = null;

      if (couponCode) {
        const [updatedCoupons] = await sequelize.query(`
          UPDATE coupons
          SET status = 'redeemed', redeemed_at = NOW()
          WHERE code = :code 
            AND status = 'available' 
            AND (user_id IS NULL OR user_id = :userId)
          RETURNING id, discount_type, discount_value
        `, {
          replacements: { code: couponCode, userId },
          transaction: t,
        });

        if (updatedCoupons.length === 0) {
          throw new AppError('Invalid, unavailable, or already redeemed coupon', 422, 'INVALID_COUPON');
        }

        const coupon = updatedCoupons[0];
        appliedCouponId = coupon.id;

        // In postgres returning, keys might be snake_case depending on sequelize mapping, let's just use raw output
        const discountType = coupon.discount_type || coupon.discountType;
        const discountValue = coupon.discount_value || coupon.discountValue;

        if (discountType === 'percentage') {
          discountAmountMinor = Math.floor((grossAmountMinor * discountValue) / 100);
        } else if (discountType === 'fixed') {
          discountAmountMinor = discountValue;
        }
        
        if (discountAmountMinor > grossAmountMinor) {
          discountAmountMinor = grossAmountMinor;
        }
      }

      const netAmountMinor = grossAmountMinor - discountAmountMinor;

      // 6. Create Order
      const order = await Order.create({
        userId,
        cartId,
        grossAmountMinor,
        discountAmountMinor,
        netAmountMinor,
        status: 'paid', // Mock payment success
        appliedCouponId
      }, { transaction: t });

      // Add order items
      const finalOrderItems = orderItemsData.map(oi => ({ ...oi, orderId: order.id }));
      await OrderItem.bulkCreate(finalOrderItems, { transaction: t });

      // If coupon was applied, update it with orderId
      if (appliedCouponId) {
        await sequelize.query(`
          UPDATE coupons
          SET redeemed_order_id = :orderId
          WHERE id = :couponId
        `, {
          replacements: { orderId: order.id, couponId: appliedCouponId },
          transaction: t
        });
      }

      // 7. Update Cart status
      cart.status = 'checked_out';
      await cart.save({ transaction: t });

      // 8. Update Idempotency record
      await IdempotencyKey.update(
        { status: 'completed', orderId: order.id },
        { where: { userId, key: idempotencyKey }, transaction: t }
      );

      // 9. Process Rewards
      const [rewardEventResult, meta] = await sequelize.query(`
        INSERT INTO reward_events (id, user_id, order_id, event_type, created_at, updated_at)
        VALUES (:id, :userId, :orderId, 'ORDER_REWARDED', NOW(), NOW())
        ON CONFLICT (user_id, order_id, event_type) DO NOTHING
        RETURNING id
      `, {
        replacements: { id: crypto.randomUUID(), userId, orderId: order.id },
        transaction: t
      });

      if (rewardEventResult && rewardEventResult.length > 0) {
        // Atomic increment of successful_order_count
        const [accountResults] = await sequelize.query(`
          INSERT INTO reward_accounts (id, user_id, successful_order_count, created_at, updated_at)
          VALUES (:accountId, :userId, 1, NOW(), NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            successful_order_count = reward_accounts.successful_order_count + 1,
            updated_at = NOW()
          RETURNING successful_order_count
        `, {
          replacements: { accountId: crypto.randomUUID(), userId },
          transaction: t
        });

        const newCount = accountResults[0].successful_order_count;
        const threshold = parseInt(process.env.REWARD_ORDER_THRESHOLD || '5', 10);

        if (newCount > 0 && newCount % threshold === 0) {
          // Milestone reached
          await sequelize.query(`
            INSERT INTO reward_events (id, user_id, order_id, event_type, milestone, created_at, updated_at)
            VALUES (:id, :userId, :orderId, 'MILESTONE_REACHED', :milestone, NOW(), NOW())
            ON CONFLICT (user_id, order_id, event_type) DO NOTHING
          `, {
            replacements: { id: crypto.randomUUID(), userId, orderId: order.id, milestone: newCount },
            transaction: t
          });

          // Generate coupon
          const code = `REWARD-${userId.substring(0, 8).toUpperCase()}-${newCount}-${crypto.randomUUID().substring(0, 4).toUpperCase()}`;
          await Coupon.create({
            code,
            userId,
            discountType: 'percentage',
            discountValue: 10,
            status: 'available',
            isActive: true,
            maxUses: 1,
            currentUses: 0
          }, { transaction: t });
        }
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
