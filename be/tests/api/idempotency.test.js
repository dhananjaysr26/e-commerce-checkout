const { handler: checkoutHandler } = require('../../src/handlers/checkout/checkout');
const { getOrCreateCart, addCartItem } = require('../../src/handlers/carts/carts');
const { sequelize } = require('../../src/models');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('Idempotency API', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getDummyEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  let cartId;
  const productId = 'a0000003-0000-4000-8000-000000000003'; // Keyboard

  it('should return the same order for identical checkout requests with same idempotency key', async () => {
    // 1. Get or create cart for user
    const cartRes = await getOrCreateCart(getDummyEvent());
    cartId = JSON.parse(cartRes.body).data.id;

    // 2. Add an item
    await addCartItem({
      ...getDummyEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    const idempotencyKey = crypto.randomUUID();

    // 3. First checkout
    const checkoutEvent = {
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': idempotencyKey },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    };

    const res1 = await checkoutHandler(checkoutEvent);
    expect(res1.statusCode).toBe(201);
    const body1 = JSON.parse(res1.body);
    const orderId1 = body1.orderId;

    // 4. Second identical checkout request (simulate retry)
    const res2 = await checkoutHandler(checkoutEvent);
    expect(res2.statusCode).toBe(201);
    const body2 = JSON.parse(res2.body);
    const orderId2 = body2.orderId;

    expect(orderId1).toBeDefined();
    expect(orderId1).toBe(orderId2); // Should return same order without duplicating
  });

  it('should reject if idempotency key is reused with different request payload', async () => {
    const cartRes = await getOrCreateCart(getDummyEvent());
    const newCartId = JSON.parse(cartRes.body).data.id;

    await addCartItem({
      ...getDummyEvent(),
      pathParameters: { cartId: newCartId },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    const idempotencyKey = crypto.randomUUID();

    // First checkout
    const checkoutEvent1 = {
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': idempotencyKey },
      pathParameters: { cartId: newCartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    };

    const res1 = await checkoutHandler(checkoutEvent1);
    expect(res1.statusCode).toBe(201);

    // Second checkout with same key but DIFFERENT payment method
    const checkoutEvent2 = {
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': idempotencyKey },
      pathParameters: { cartId: newCartId },
      body: JSON.stringify({ paymentMethodId: 'pm_456' })
    };

    const res2 = await checkoutHandler(checkoutEvent2).catch(e => e);
    
    // In our implementation, since the handler uses withErrorHandler, it returns statusCode 409
    expect(res2.statusCode).toBe(409);
    const errorBody = JSON.parse(res2.body);
    expect(errorBody.error.message).toMatch(/Idempotency key reused with different request/);
  });
});
