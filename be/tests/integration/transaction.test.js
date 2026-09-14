const { sequelize, Order, Coupon, Cart, CartItem, User, Product, OrderItem, IdempotencyKey } = require('../../src/models');
const checkoutService = require('../../src/services/checkout.service');
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;
// vitest globals available

describe('Transaction Integrity and Rollback Tests', () => {
  let user1;
  let productId;
  let cart;

  beforeAll(async () => {});
  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query('TRUNCATE TABLE "users", "products", "carts", "cart_items", "orders", "order_items", "idempotency_keys", "coupons" CASCADE;');
    
    user1 = await User.create({ email: 'tx@test.com', passwordHash: 'h', role: 'customer' });
    const p = await Product.create({ name: 'P', description: 'D', unitPriceMinor: 1000, inventory: 10 });
    productId = p.id;
    
    cart = await Cart.create({ userId: user1.id, status: 'open' });
    await CartItem.create({ cartId: cart.id, productId, quantity: 2 });
  });

  it('1. Inventory update followed by order creation failure leaves no partial state', async () => {
    vi.spyOn(Order, 'create').mockRejectedValueOnce(new Error('Simulated order creation failure'));

    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash')
    ).rejects.toThrow('Simulated order creation failure');

    const orders = await Order.findAll();
    expect(orders.length).toBe(0);

    const p = await Product.findByPk(productId);
    expect(p.inventory).toBe(10); 

    const c = await Cart.findByPk(cart.id);
    expect(c.status).toBe('open');

    Order.create.mockRestore();
  });

  it('2. Order creation followed by order item failure', async () => {
    vi.spyOn(OrderItem, 'bulkCreate').mockRejectedValueOnce(new Error('Simulated order item failure'));

    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash')
    ).rejects.toThrow('Simulated order item failure');

    const orders = await Order.findAll();
    expect(orders.length).toBe(0); 

    const items = await OrderItem.findAll();
    expect(items.length).toBe(0);

    const c = await Cart.findByPk(cart.id);
    expect(c.status).toBe('open');

    OrderItem.bulkCreate.mockRestore();
  });

  it('3. Coupon redemption followed by order creation failure', async () => {
    const coupon = await Coupon.create({ code: 'DISCOUNT', discountType: 'fixed', discountValue: 500, status: 'available', isActive: true, currentUses: 0 });

    vi.spyOn(Order, 'create').mockRejectedValueOnce(new Error('Simulated order failure'));

    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', 'DISCOUNT', uuidv4(), 'hash')
    ).rejects.toThrow('Simulated order failure');

    const cp = await Coupon.findByPk(coupon.id);
    expect(cp.status).toBe('available');
    expect(cp.redeemedOrderId).toBeNull();
    
    Order.create.mockRestore();
  });

  it('4. Cart update failure', async () => {
    vi.spyOn(Cart.prototype, 'save').mockRejectedValueOnce(new Error('Simulated cart save failure'));

    await expect(
      checkoutService.processCheckout(user1.id, cart.id, 'pm_1', null, uuidv4(), 'hash')
    ).rejects.toThrow('Simulated cart save failure');

    const orders = await Order.findAll();
    expect(orders.length).toBe(0);

    Cart.prototype.save.mockRestore();
  });
});
