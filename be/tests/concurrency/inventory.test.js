// vitest globals available
const { sequelize, Product, User, Cart, CartItem, Order, IdempotencyKey } = require('../../src/models');
const checkoutService = require('../../src/services/checkout.service');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;

describe('Inventory Concurrency Tests', () => {
  let user1, user2;
  let productId;

  beforeAll(async () => {
    // We already migrated/seeded DB, just need to connect
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear and re-create basic data
    await sequelize.query('TRUNCATE TABLE "users", "products", "carts", "cart_items", "orders", "order_items", "idempotency_keys" CASCADE;');
    
    // Create users
    user1 = await User.create({ email: 'user1@test.com', passwordHash: 'hash', role: 'customer' });
    user2 = await User.create({ email: 'user2@test.com', passwordHash: 'hash', role: 'customer' });

    const product = await Product.create({
      name: 'Limited Edition Widget',
      description: 'A very limited widget',
      unitPriceMinor: 1000,
      inventory: 1 // Start with 1 inventory!
    });
    productId = product.id;
  });

  it('Invariants 1 & 3: Two concurrent checkouts competing for the final unit must result in exactly one success', async () => {
    // Two different users with two different carts competing for the SAME product (inventory=1)
    
    // User 1 Cart
    const cart1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart1.id, productId, quantity: 1 });

    // User 2 Cart
    const cart2 = await Cart.create({ userId: user2.id, status: 'open' });
    await CartItem.create({ cartId: cart2.id, productId, quantity: 1 });

    // Execute concurrently
    const p1 = checkoutService.processCheckout(user1.id, cart1.id, 'pm_1', null, uuidv4(), 'hash1');
    const p2 = checkoutService.processCheckout(user2.id, cart2.id, 'pm_2', null, uuidv4(), 'hash2');

    const results = await Promise.allSettled([p1, p2]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    expect(failures[0].reason.message).toMatch(/Insufficient inventory/);

    const product = await Product.findByPk(productId);
    expect(product.inventory).toBe(0); // Never negative
  });

  it('Invariant 4: Concurrent checkout of same cart must create only one order', async () => {
    const product = await Product.findByPk(productId);
    await product.update({ inventory: 10 });

    const cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 1 });

    const p1 = checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash1');
    const p2 = checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash2');

    const results = await Promise.allSettled([p1, p2]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].reason.message).toMatch(/Cart is already checked out/);

    const orders = await Order.findAll({ where: { cartId: cart.id } });
    expect(orders.length).toBe(1);

    const updatedCart = await Cart.findByPk(cart.id);
    expect(updatedCart.status).toBe('checked_out');

    const updatedProduct = await Product.findByPk(productId);
    expect(updatedProduct.inventory).toBe(9);
  });

  it('Invariant 2 & 5: Failed checkout must not partially deduct inventory, Successful quantity never exceeds initial', async () => {
    // Try to checkout more than available
    const cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 5 }); // only 1 available

    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash')
    ).rejects.toThrow(/Insufficient inventory/);

    const product = await Product.findByPk(productId);
    expect(product.inventory).toBe(1); // Unchanged

    const orders = await Order.findAll({ where: { cartId: cart.id } });
    expect(orders.length).toBe(0);
  });
});
