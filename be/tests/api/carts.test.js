const { getOrCreateCart, addCartItem } = require('../../src/handlers/carts/carts');
const { sequelize } = require('../../src/models');

const jwt = require('jsonwebtoken');

describe('Carts API', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getDummyEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111', role: 'customer' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  let cartId;
  const productId = 'a0000001-0000-4000-8000-000000000001'; // Seeded Headphones

  it('POST /carts should return an active cart', async () => {
    const response = await getOrCreateCart(getDummyEvent());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveProperty('id');
    expect(body.data.status).toBe('OPEN');
    cartId = body.data.id;
  });

  it('POST /carts/:cartId/items should reject invalid quantity (0)', async () => {
    const event = {
      ...getDummyEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId, quantity: 0 }),
    };

    const response = await addCartItem(event);
    expect(response.statusCode).toBe(400); // Zod validation should fail
  });

  it('POST /carts/:cartId/items should add product to cart', async () => {
    const event = {
      ...getDummyEvent(),
      pathParameters: { cartId },
      body: JSON.stringify({ productId, quantity: 1 }),
    };

    const response = await addCartItem(event);
    expect(response.statusCode).toBe(201);
    
    const body = JSON.parse(response.body);
    const item = body.data.items.find(i => i.productId === productId);
    
    expect(item).toBeDefined();
    expect(item.quantity).toBeGreaterThanOrEqual(1);
    expect(item.name).toBe('Wireless Bluetooth Headphones');
    expect(item.unitPriceMinor).toBe(7999);
    expect(item.lineTotalMinor).toBe(item.unitPriceMinor * item.quantity);
  });
});
