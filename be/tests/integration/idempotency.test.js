// vitest globals available
const { sequelize, Product, User, Cart, CartItem, Order, IdempotencyKey } = require('../../src/models');
const checkoutService = require('../../src/services/checkout.service');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;

describe('Idempotency Deep-Dive Tests', () => {
  let user1;
  let productId;

  beforeAll(async () => {
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query('TRUNCATE TABLE "users", "products", "carts", "cart_items", "orders", "order_items", "idempotency_keys" CASCADE;');
    
    user1 = await User.create({ email: 'user_idem@test.com', passwordHash: 'hash', role: 'customer' });

    const product = await Product.create({
      name: 'Unlimited Edition Widget',
      description: 'A widget',
      unitPriceMinor: 1000,
      inventory: 100
    });
    productId = product.id;
  });

  it('Invariants 1 & 2: Same key, same request, sequential retry (duplicate delivery)', async () => {
    const cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 1 });
    
    const key = uuidv4();
    const reqHash = 'hash123';
    
    const order1 = await checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash);
    
    // retry exactly the same
    const order2 = await checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash);
    
    expect(order1.id).toBe(order2.id); // Same-key retries return the original order

    const orders = await Order.findAll({ where: { cartId: cart.id } });
    expect(orders.length).toBe(1);
  });

  it('Invariant: Same key, same request, concurrent retry', async () => {
    const cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 1 });
    
    const key = uuidv4();
    const reqHash = 'hash123';
    
    const p1 = checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash);
    const p2 = checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash);
    
    const results = await Promise.allSettled([p1, p2]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    
    expect(successes.length).toBeGreaterThan(0);
    if (failures.length > 0) {
      expect(failures[0].reason.message).toMatch(/Cart is already checked out|Concurrent request with same idempotency key in progress/);
    }
    
    const orders = await Order.findAll({ where: { cartId: cart.id } });
    expect(orders.length).toBe(1);
  });

  it('Invariant 3: Same key, different request returns 409', async () => {
    const cart1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart1.id, productId, quantity: 1 });
    
    const key = uuidv4();
    
    await checkoutService.processCheckout(user1.id, cart1.id, 'pm_1', null, key, 'hash_A');
    
    // Create new cart since first is now checked out
    const cart2 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart2.id, productId, quantity: 1 });
    
    // Same key, different hash
    await expect(
      checkoutService.processCheckout(user1.id, cart2.id, 'pm_1', null, key, 'hash_B')
    ).rejects.toThrow(/Idempotency key reused with different request/);
  });

  it('Invariant 4: Failed checkout must not permanently block a retry', async () => {
    const cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 500 }); // More than inventory
    
    const key = uuidv4();
    const reqHash = 'hash123';
    
    // First attempt fails
    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash)
    ).rejects.toThrow(/Insufficient inventory/);
    
    // Update idempotency key status to failed in the DB to mock the failure catch behavior
    // Wait, the processCheckout doesn't update the idempotency key status to 'failed' on error!
    // Let's check `checkout.service.js`. Does it?
    // In catch (error), it does `await t.rollback();`. The idempotency key creation is rolled back!
    // So the record is GONE! That means retry will just work normally like a first request!
    
    // Let's verify by fixing inventory and retrying
    const product = await Product.findByPk(productId);
    await product.update({ inventory: 1000 });
    
    const order = await checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, key, reqHash);
    expect(order).toBeDefined();
    expect(order.netAmountMinor).toBe(500 * 1000);
  });
});
