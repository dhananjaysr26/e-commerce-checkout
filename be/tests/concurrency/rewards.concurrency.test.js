const { sequelize, User, Cart, CartItem, Product, RewardAccount, RewardEvent, Order } = require('../../src/models');
const crypto = require('crypto');
const { processCheckout } = require('../../src/services/checkout.service');

describe('Rewards Concurrency', () => {
  let user, product, cart;
  
  beforeAll(async () => {
    user = await User.create({ email: `reward-conc-${Date.now()}@test.com`, passwordHash: 'hash' });
    product = await Product.create({ name: 'Conc Item', description: 'desc', unitPriceMinor: 100, inventory: 100 });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should not double-increment reward account if same order is processed concurrently', async () => {
    cart = await Cart.create({ userId: user.id });
    await CartItem.create({ cartId: cart.id, productId: product.id, quantity: 1 });
    
    // We mock a scenario where somehow two processes try to process the same checkout or insert reward event.
    // Instead of messing with checkout service (which prevents it via idempotency), we'll do raw concurrent inserts to reward_events/reward_accounts.
    const t1 = await sequelize.transaction();
    const t2 = await sequelize.transaction();
    
    const orderId = crypto.randomUUID();
    await Order.create({ id: orderId, userId: user.id, cartId: cart.id, grossAmountMinor: 100, discountAmountMinor: 0, netAmountMinor: 100, status: 'paid' });
    
    async function processReward(t) {
      const [rewardEventResult] = await sequelize.query(`
        INSERT INTO reward_events (id, user_id, order_id, event_type, created_at, updated_at)
        VALUES (:id, :userId, :orderId, 'ORDER_REWARDED', NOW(), NOW())
        ON CONFLICT (user_id, order_id, event_type) DO NOTHING
        RETURNING id
      `, {
        replacements: { id: crypto.randomUUID(), userId: user.id, orderId },
        transaction: t
      });

      if (rewardEventResult && rewardEventResult.length > 0) {
        await sequelize.query(`
          INSERT INTO reward_accounts (id, user_id, successful_order_count, created_at, updated_at)
          VALUES (:accountId, :userId, 1, NOW(), NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            successful_order_count = reward_accounts.successful_order_count + 1,
            updated_at = NOW()
        `, {
          replacements: { accountId: crypto.randomUUID(), userId: user.id },
          transaction: t
        });
      }
      await t.commit();
    }
    
    await Promise.all([processReward(t1), processReward(t2)]);
    
    const events = await RewardEvent.findAll({ where: { orderId } });
    expect(events.length).toBe(1); // Only 1 event created
    
    const acc = await RewardAccount.findOne({ where: { userId: user.id } });
    expect(acc.successfulOrderCount).toBe(1); // Only incremented once
  });
});
