const { handler: getProductsHandler } = require('../../src/handlers/products/getProducts');
const { getOrCreateCart, addCartItem } = require('../../src/handlers/carts/carts');
const { handler: checkoutHandler } = require('../../src/handlers/checkout/checkout');
const { generateCoupon, getReport } = require('../../src/handlers/admin/admin');
const { sequelize, Product } = require('../../src/models');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('End-to-End Checkout Flow', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getAdminEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'admin' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  const getUserEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '22222222-2222-2222-2222-222222222222', role: 'customer' }, process.env.JWT_SECRET || 'supersecret')}` } // Bob
  });

  it('should complete the entire flow: cart -> items -> coupon -> checkout -> report', async () => {
    // 1. Get products list
    const prodRes = await getProductsHandler({});
    expect(prodRes.statusCode).toBe(200);
    const products = JSON.parse(prodRes.body).data;
    const p1 = products[0]; // Headphones
    const p2 = products[1]; // Charger

    // Fetch initial inventory manually to verify later
    const initialInv1 = (await Product.findByPk(p1.id)).inventory;
    const initialInv2 = (await Product.findByPk(p2.id)).inventory;

    // 2. Create Cart
    const cartRes = await getOrCreateCart(getUserEvent());
    expect(cartRes.statusCode).toBe(200);
    const cartId = JSON.parse(cartRes.body).data.id;

    // 3. Add items to cart
    await addCartItem({
      ...getUserEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId: p1.id, quantity: 2 })
    });
    
    await addCartItem({
      ...getUserEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId: p2.id, quantity: 1 })
    });

    const expectedGrossMinor = (p1.unitPriceMinor * 2) + (p2.unitPriceMinor * 1);

    // 4. First checkout without coupon to get an order count for milestone
    const checkoutRes1 = await checkoutHandler({
      ...getUserEvent(),
      headers: { ...getUserEvent().headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    });
    expect(checkoutRes1.statusCode).toBe(201);

    // 5. Admin generates a coupon (milestone = 1)
    const couponRes = await generateCoupon({
      ...getAdminEvent(),
      body: JSON.stringify({ milestoneInterval: 1, discountType: 'percentage', discountValue: 10 })
    });
    expect(couponRes.statusCode).toBe(200);
    const parsedCoupon = JSON.parse(couponRes.body);
    expect(parsedCoupon.generated).toBe(true);
    const couponCode = parsedCoupon.coupon.code;

    // 6. Create another cart and add item to test checkout WITH coupon
    const cartRes2 = await getOrCreateCart(getUserEvent());
    const cartId2 = JSON.parse(cartRes2.body).data.id;
    await addCartItem({
      ...getUserEvent(),
      pathParameters: { cartId: cartId2 },
      body: JSON.stringify({ productId: p1.id, quantity: 1 }) // 1 Headphone
    });

    const checkoutRes2 = await checkoutHandler({
      ...getUserEvent(),
      headers: { ...getUserEvent().headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId: cartId2 },
      body: JSON.stringify({ paymentMethodId: 'pm_123', couponCode })
    });

    expect(checkoutRes2.statusCode).toBe(201);
    const orderData2 = JSON.parse(checkoutRes2.body);

    const expectedDiscount = Math.floor(p1.unitPriceMinor * 0.1);
    const expectedNet = p1.unitPriceMinor - expectedDiscount;

    expect((orderData2.data || orderData2).netAmountMinor).toBe(expectedNet);

    // 7. Verify Inventory is deducted (2 headphones in first, 1 headphone in second checkout. 1 charger in first)
    const finalInv1 = (await Product.findByPk(p1.id)).inventory;
    const finalInv2 = (await Product.findByPk(p2.id)).inventory;
    expect(finalInv1).toBe(initialInv1 - 3);
    expect(finalInv2).toBe(initialInv2 - 1);

    // 8. Verify Admin Report includes the order
    const reportRes = await getReport(getAdminEvent());
    expect(reportRes.statusCode).toBe(200);
    const report = JSON.parse(reportRes.body);
    expect(report.totalOrders).toBeGreaterThanOrEqual(2);
    expect(report.grossRevenue).toBeGreaterThanOrEqual(expectedGrossMinor + p1.unitPriceMinor); 
  });
});
