const { sequelize, Order, Coupon, Cart, CartItem, User, Product, OrderItem, IdempotencyKey } = require('../../src/models');
const adminService = require('../../src/services/admin.service');
const checkoutService = require('../../src/services/checkout.service');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;
// vitest globals available

describe('Report and Accounting Correctness Tests', () => {
  let user1;
  let p1, p2;

  beforeAll(async () => {});
  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query('TRUNCATE TABLE "users", "products", "carts", "cart_items", "orders", "order_items", "idempotency_keys", "coupons" CASCADE;');
    
    user1 = await User.create({ email: 'report@test.com', passwordHash: 'h', role: 'customer' });
    p1 = await Product.create({ name: 'P1', unitPriceMinor: 1000, inventory: 100 });
    p2 = await Product.create({ name: 'P2', unitPriceMinor: 500, inventory: 100 });
  });

  it('Report quantity and amounts reconcile perfectly, ignoring failures and retries', async () => {
    const c1 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c1.id, productId: p1.id, quantity: 2 }); 
    await CartItem.create({ cartId: c1.id, productId: p2.id, quantity: 1 }); 
    
    const key1 = uuidv4();
    await checkoutService.processCheckout(user1.id, c1.id, 'pm_1', null, key1, 'h1');
    await checkoutService.processCheckout(user1.id, c1.id, 'pm_1', null, key1, 'h1');

    await p1.update({ unitPriceMinor: 2000 });

    const couponRes = await adminService.generateCoupon(1, 'percentage', 10);
    const code = couponRes.coupon.code;

    const c2 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c2.id, productId: p1.id, quantity: 1 }); 

    await checkoutService.processCheckout(user1.id, c2.id, 'pm_2', code, uuidv4(), 'h2');

    const c3 = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: c3.id, productId: p1.id, quantity: 500 }); 

    try {
      await checkoutService.processCheckout(user1.id, c3.id, 'pm_3', null, uuidv4(), 'h3');
    } catch(e) {}

    const report = await adminService.getReport();

    expect(report.totalOrders).toBe(2);
    expect(report.grossRevenue).toBe(4500);
    expect(report.totalDiscounts).toBe(200);
    expect(report.netRevenue).toBe(4300);

    const p1Stats = report.productQuantities.find(q => q.productId === p1.id);
    expect(p1Stats.quantity).toBe(3); 

    const p2Stats = report.productQuantities.find(q => q.productId === p2.id);
    expect(p2Stats.quantity).toBe(1);

    expect(report.coupons.generated).toBe(1);
    expect(report.coupons.available).toBe(0);
    expect(report.coupons.redeemed).toBe(1);
  });
});
