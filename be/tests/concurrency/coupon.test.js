const { sequelize, Order, Coupon, Cart, CartItem, User, Product, IdempotencyKey } = require('../../src/models');
const adminService = require('../../src/services/admin.service');
const checkoutService = require('../../src/services/checkout.service');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;

describe('Coupon Concurrency Tests', () => {
  let user1, user2;
  let productId;

  beforeAll(async () => {});
  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query('TRUNCATE TABLE "users", "products", "carts", "cart_items", "orders", "order_items", "idempotency_keys", "coupons" CASCADE;');
    
    user1 = await User.create({ email: 'u1@t.com', passwordHash: 'h', role: 'customer' });
    user2 = await User.create({ email: 'u2@t.com', passwordHash: 'h', role: 'customer' });

    const p = await Product.create({ name: 'P', description: 'D', unitPriceMinor: 1000, inventory: 100 });
    productId = p.id;
  });

  it('Invariant: One milestone creates at most one coupon (Duplicate generation for same milestone)', async () => {
    // Create some paid orders to make milestone eligible
    for (let i = 0; i < 10; i++) {
      const c = await Cart.create({ userId: user1.id, status: 'checked_out' });
      await Order.create({ userId: user1.id, cartId: c.id, grossAmountMinor: 1000, discountAmountMinor: 0, netAmountMinor: 1000, status: 'paid' });
    }

    // Two concurrent requests to generate a milestone coupon for every 10 orders
    const p1 = adminService.generateCoupon(10, 'fixed', 500);
    const p2 = adminService.generateCoupon(10, 'fixed', 500);
    const p3 = adminService.generateCoupon(10, 'fixed', 500);
    
    const results = await Promise.all([p1, p2, p3]);

    const generated = results.filter(r => r.generated);
    const failed = results.filter(r => !r.generated);

    expect(generated.length).toBe(1); // exactly one coupon generated!
    expect(failed.length).toBe(2);

    const coupons = await Coupon.findAll();
    expect(coupons.length).toBe(1);
    expect(coupons[0].milestone).toBe(10);
  });

  it('Invariants: One coupon redeemed at most once, Concurrent redemption', async () => {
    const coupon = await Coupon.create({
      code: 'ATOMIC10',
      discountType: 'fixed',
      discountValue: 200,
      status: 'available',
      isActive: true,
      currentUses: 0
    });

    // Two carts, two users
    const c1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c1.id, productId, quantity: 1 }); // gross 1000

    const c2 = await Cart.create({ userId: user2.id, status: 'open' });
    await CartItem.create({ cartId: c2.id, productId, quantity: 1 }); // gross 1000

    const p1 = checkoutService.processCheckout(user1.id, c1.id, 'pm_1', 'ATOMIC10', uuidv4(), 'h1');
    const p2 = checkoutService.processCheckout(user2.id, c2.id, 'pm_1', 'ATOMIC10', uuidv4(), 'h2');

    const results = await Promise.allSettled([p1, p2]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    expect(failures[0].reason.message).toMatch(/Invalid, unavailable, or already redeemed coupon/);

    const updatedCoupon = await Coupon.findByPk(coupon.id);
    expect(updatedCoupon.status).toBe('redeemed');
    expect(updatedCoupon.redeemedOrderId).toBe(successes[0].value.id);
    
    expect(successes[0].value.netAmountMinor).toBe(800); // 1000 - 200
  });

  it('Invariant: Failed checkout does not consume a coupon', async () => {
    const coupon = await Coupon.create({
      code: 'KEEP_ME',
      discountType: 'fixed',
      discountValue: 200,
      status: 'available',
      isActive: true,
      currentUses: 0
    });

    const c1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c1.id, productId, quantity: 500 }); // Exceeds inventory

    await expect(
      checkoutService.processCheckout(user1.id, c1.id, 'pm_1', 'KEEP_ME', uuidv4(), 'h1')
    ).rejects.toThrow(/Insufficient inventory/);

    // Coupon must remain available
    const updatedCoupon = await Coupon.findByPk(coupon.id);
    expect(updatedCoupon.status).toBe('available');
    expect(updatedCoupon.redeemedOrderId).toBeNull();
  });

  it('Invariant: Net amount is never negative, Discount > Gross', async () => {
    const coupon = await Coupon.create({
      code: 'SUPER_DISCOUNT',
      discountType: 'fixed',
      discountValue: 5000, // greater than 1000
      status: 'available',
      isActive: true,
      currentUses: 0
    });

    const c1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c1.id, productId, quantity: 1 }); // gross 1000

    const order = await checkoutService.processCheckout(user1.id, c1.id, 'pm_1', 'SUPER_DISCOUNT', uuidv4(), 'h1');
    expect(order.netAmountMinor).toBe(0); // Cannot be negative
    expect(order.discountAmountMinor).toBe(1000);
  });
});
