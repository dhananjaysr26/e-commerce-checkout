const { getRewards } = require('../../src/handlers/rewards/rewards');
const { sequelize, User, Order, Cart, RewardAccount, RewardEvent } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Rewards API', () => {
  let user;

  beforeAll(async () => {
    user = await User.create({ email: `api-rewards-${Date.now()}@test.com`, passwordHash: 'hash' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const getEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: user.id, role: 'customer' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  it('should return 0 progress if no account exists', async () => {
    const res = await getRewards(getEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.progress).toBe(0);
    expect(body.data.history.length).toBe(0);
  });

  it('should return progress and history when data exists', async () => {
    const cart = await Cart.create({ userId: user.id });
    const order = await Order.create({ userId: user.id, cartId: cart.id, grossAmountMinor: 100, discountAmountMinor: 0, netAmountMinor: 100 });
    await RewardAccount.create({ userId: user.id, successfulOrderCount: 3 });
    await RewardEvent.create({ userId: user.id, orderId: order.id, eventType: 'ORDER_REWARDED' });

    const res = await getRewards(getEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.progress).toBe(3);
    expect(body.data.history.length).toBe(1);
    expect(body.data.history[0].eventType).toBe('ORDER_REWARDED');
  });
});
