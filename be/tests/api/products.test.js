const { handler: getProducts } = require('../../src/handlers/products/getProducts');
const { sequelize } = require('../../src/models');

describe('Products API', () => {
  beforeAll(async () => {
    const { execSync } = require('child_process');
    execSync('npm run db:reset', { stdio: 'ignore' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('GET /products should return seeded products with correct structure', async () => {
    const response = await getProducts({}); // call handler directly
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
    
    // There should be 6 seeded products
    expect(body.data.length).toBeGreaterThan(0);

    const firstProduct = body.data[0];
    expect(firstProduct).toHaveProperty('id');
    expect(firstProduct).toHaveProperty('name');
    expect(firstProduct).toHaveProperty('unitPriceMinor');
    expect(firstProduct).toHaveProperty('currency', 'INR');
    expect(firstProduct).toHaveProperty('inventory');
    
    // Check that it's an integer
    expect(Number.isInteger(firstProduct.unitPriceMinor)).toBe(true);
  });
});
