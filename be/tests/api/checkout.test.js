const { handler: checkoutHandler } = require('../../src/handlers/checkout/checkout');
const { getOrCreateCart, addCartItem } = require('../../src/handlers/carts/carts');
const { sequelize } = require('../../src/models');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('Checkout API', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getDummyEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '22222222-2222-2222-2222-222222222222' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  let cartId;
  const productId = 'a0000001-0000-4000-8000-000000000001'; // Seeded Headphones

  it('should successfully checkout a newly created cart', async () => {
    // 1. Get or create cart for Bob
    const cartRes = await getOrCreateCart(getDummyEvent());
    expect(cartRes.statusCode).toBe(200);
    cartId = JSON.parse(cartRes.body).data.id;

    // 2. Add an item
    const addItemEvent = {
      ...getDummyEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId, quantity: 2 })
    };
    const addRes = await addCartItem(addItemEvent);
    expect(addRes.statusCode).toBe(201);

    // 3. Checkout
    const idempotencyKey = crypto.randomUUID();
    const checkoutEvent = {
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': idempotencyKey },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    };
    
    const checkoutRes = await checkoutHandler(checkoutEvent);
    expect(checkoutRes.statusCode).toBe(201);
    
    const body = JSON.parse(checkoutRes.body);
    expect((body.data || body).message).toBe('Checkout successful');
    expect(body.data || body).toHaveProperty('orderId');
  });

  it('should reject checkout without idempotency key', async () => {
    const checkoutEvent = {
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    };
    
    const checkoutRes = await checkoutHandler(checkoutEvent).catch(e => e);
    // Since it's wrapped in withErrorHandler, it returns a 400 response
    expect(checkoutRes.statusCode).toBe(400);
    const body = JSON.parse(checkoutRes.body);
    expect(body.error.message).toMatch(/Idempotency key is required/);
  });
});
