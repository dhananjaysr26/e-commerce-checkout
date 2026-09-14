const { handler: checkoutHandler } = require('../../src/handlers/checkout/checkout');
const { getOrCreateCart, addCartItem } = require('../../src/handlers/carts/carts');
const { sequelize, Product } = require('../../src/models');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('Concurrency API', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getDummyEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  let cartId;
  const productId = 'a0000002-0000-4000-8000-000000000002'; // Seeded Monitor

  it('should prevent double checkout race conditions on the same cart', async () => {
    // 1. Get or create cart for user (Alice)
    const cartRes = await getOrCreateCart(getDummyEvent());
    cartId = JSON.parse(cartRes.body).data.id;

    // 2. Add an item
    const addItemEvent = {
      ...getDummyEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId, quantity: 1 })
    };
    await addCartItem(addItemEvent);

    // 3. Fire two checkout requests simultaneously with DIFFERENT idempotency keys
    const req1 = checkoutHandler({
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    });
    
    const req2 = checkoutHandler({
      ...getDummyEvent(),
      headers: { ...getDummyEvent().headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    });

    const results = await Promise.allSettled([req1, req2]);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 201);
    const rejectedOrError = results.filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && r.value.statusCode !== 201)
    );

    expect(fulfilled.length).toBe(1);
    expect(rejectedOrError.length).toBe(1);

    if (rejectedOrError[0].status === 'fulfilled') {
      const errorBody = JSON.parse(rejectedOrError[0].value.body);
      expect(errorBody.error.message).toMatch(/already checked out/);
    }
  });

  it('should prevent inventory over-deduction across different carts', async () => {
    // We already checked out Alice's cart, so she needs a new one. Or we can just use her new one.
    // Setup 2 users buying the same product
    const eventUser1 = { headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111' }, process.env.JWT_SECRET || 'supersecret')}` } }; // Alice
    const eventUser2 = { headers: { Authorization: `Bearer ${jwt.sign({ id: '22222222-2222-2222-2222-222222222222' }, process.env.JWT_SECRET || 'supersecret')}` } }; // Bob

    const c1Res = await getOrCreateCart(eventUser1);
    const c2Res = await getOrCreateCart(eventUser2);
    
    const c1Id = JSON.parse(c1Res.body).data.id;
    const c2Id = JSON.parse(c2Res.body).data.id;

    // Find the product's current inventory
    const p = await Product.findByPk(productId);
    const initialInv = p.inventory;
    
    // We want to request (initialInv) quantity in cart 1, and (initialInv) quantity in cart 2
    await addCartItem({ ...eventUser1, pathParameters: { cartId: c1Id }, body: JSON.stringify({ productId, quantity: initialInv }) });
    await addCartItem({ ...eventUser2, pathParameters: { cartId: c2Id }, body: JSON.stringify({ productId, quantity: initialInv }) });

    // Fire both checkouts simultaneously
    const req1 = checkoutHandler({
      ...eventUser1,
      headers: { ...eventUser1.headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId: c1Id },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    });

    const req2 = checkoutHandler({
      ...eventUser2,
      headers: { ...eventUser2.headers, 'x-idempotency-key': crypto.randomUUID() },
      pathParameters: { cartId: c2Id },
      body: JSON.stringify({ paymentMethodId: 'pm_123' })
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 201);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.statusCode !== 201));
    
    // Only one should succeed because inventory cannot drop below zero
    expect(fulfilled.length).toBe(1);
    expect(failed.length).toBe(1);

    if (failed[0].status === 'fulfilled') {
      const errorBody = JSON.parse(failed[0].value.body);
      expect(errorBody.error.message).toMatch(/Insufficient inventory/);
    }
  });
});
