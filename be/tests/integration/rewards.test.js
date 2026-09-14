const { processCheckout } = require('../../src/services/checkout.service');
const { sequelize, User, Cart, CartItem, Product, RewardAccount, RewardEvent, Coupon } = require('../../src/models');
const crypto = require('crypto');

describe('Rewards Integration', () => {
  let user, product, cart;

  beforeAll(async () => {
    product = await Product.create({ name: 'Reward Item', description: 'Desc', unitPriceMinor: 1000, inventory: 100 });
  });

  beforeEach(async () => {
    user = await User.create({ email: `test-rewards-${crypto.randomUUID()}@example.com`, passwordHash: 'hash' });
    cart = await Cart.create({ userId: user.id });
    await CartItem.create({ cartId: cart.id, productId: product.id, quantity: 1 });
  });

  afterAll(async () => {
    await sequelize.close();
  });



  it('should increment successful_order_count and emit ORDER_REWARDED', async () => {
    const key = crypto.randomUUID();
    const order = await processCheckout(user.id, cart.id, 'pm_1', null, key, 'hash');

    const account = await RewardAccount.findOne({ where: { userId: user.id } });
    expect(account).toBeDefined();
    expect(account.successfulOrderCount).toBe(1);

    const events = await RewardEvent.findAll({ where: { userId: user.id } });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('ORDER_REWARDED');
    expect(events[0].orderId).toBe(order.id);
  });
  
  it('should trigger milestone at threshold', async () => {
    // Check out the cart from beforeEach first
    const key = crypto.randomUUID();
    await processCheckout(user.id, cart.id, 'pm_1', null, key, 'hash');

    // Current count is 1. We need 4 more to reach 5.
    for (let i = 0; i < 4; i++) {
      const c = await Cart.create({ userId: user.id });
      await CartItem.create({ cartId: c.id, productId: product.id, quantity: 1 });
      await processCheckout(user.id, c.id, 'pm_1', null, crypto.randomUUID(), 'hash');
    }

    const account = await RewardAccount.findOne({ where: { userId: user.id } });
    expect(account.successfulOrderCount).toBe(5);

    const events = await RewardEvent.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']] });
    // Should have 5 ORDER_REWARDED + 1 MILESTONE_REACHED
    expect(events.length).toBe(6);
    const milestoneEvent = events.find(e => e.eventType === 'MILESTONE_REACHED');
    expect(milestoneEvent).toBeDefined();
    expect(milestoneEvent.milestone).toBe(5);

    // Check if coupon was generated
    const { Op } = require('sequelize');
    const coupons = await Coupon.findAll({ where: { code: { [Op.like]: `REWARD-${user.id.substring(0, 8).toUpperCase()}-5-%` } } });
    expect(coupons.length).toBe(1);
    expect(coupons[0].discountValue).toBe(10);
  });
});
