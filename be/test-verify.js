const { sequelize, User, Product, Cart, Coupon } = require('./src/models');
const checkoutService = require('./src/services/checkout.service');
const adminService = require('./src/services/admin.service');

async function test() {
  const alice = await User.findOne({ where: { email: 'alice@example.com' } });
  const admin = await User.findOne({ where: { email: 'admin@example.com' } });

  console.log('Alice:', alice.id);

  const cart = await Cart.findOne({ where: { userId: alice.id, status: 'open' } });
  console.log('Cart:', cart.id);

  // Run checkout
  try {
    const order1 = await checkoutService.processCheckout(
      alice.id,
      cart.id,
      'pm_card_visa',
      'WELCOME10', // coupon code
      'idempotency-key-1',
      'hash1'
    );
    console.log('Checkout 1 SUCCESS. Order ID:', order1.id, 'Net Amount Minor:', order1.netAmountMinor);
  } catch (err) {
    console.error('Checkout 1 FAILED:', err.message);
  }

  // Idempotency retry
  try {
    const orderRetry = await checkoutService.processCheckout(
      alice.id,
      cart.id,
      'pm_card_visa',
      'WELCOME10',
      'idempotency-key-1',
      'hash1'
    );
    console.log('Checkout 1 Retry SUCCESS (Idempotent). Order ID:', orderRetry.id);
  } catch (err) {
    console.error('Checkout 1 Retry FAILED:', err.message);
  }

  // Check admin reports
  const report = await adminService.getReport();
  console.log('Report:', JSON.stringify(report, null, 2));
  
  // Try to generate coupon
  const c1 = await adminService.generateCoupon(1, 'fixed', 500); // 1 order should make 1 eligible
  console.log('Generate Coupon:', c1);

  process.exit(0);
}

test();
