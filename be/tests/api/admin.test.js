const { generateCoupon, getReport } = require('../../src/handlers/admin/admin');
const { sequelize } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Admin API', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  const getAdminEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'admin' }, process.env.JWT_SECRET || 'supersecret')}` }
  });
  
  const getUserEvent = () => ({
    headers: { Authorization: `Bearer ${jwt.sign({ id: '11111111-1111-1111-1111-111111111111', role: 'customer' }, process.env.JWT_SECRET || 'supersecret')}` }
  });

  it('GET /admin/report should return report', async () => {
    const res = await getReport(getAdminEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('totalOrders');
    expect(body).toHaveProperty('grossRevenue');
    expect(body.coupons).toBeDefined();
  });

  it('GET /admin/report should reject non-admin', async () => {
    const res = await getReport(getUserEvent()).catch(e => e);
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.message).toBe('Forbidden');
  });

  it('POST /admin/coupons should return coupon status', async () => {
    const event = {
      ...getAdminEvent(),
      body: JSON.stringify({
        milestoneInterval: 5,
        discountType: 'fixed',
        discountValue: 500
      })
    };
    const res = await generateCoupon(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('generated');
  });
});
