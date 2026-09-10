'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('coupons', [
      {
        id: 'c0000001-0000-4000-8000-000000000001',
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        is_active: true,
        max_uses: null,         // unlimited
        current_uses: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c0000002-0000-4000-8000-000000000002',
        code: 'FLAT500',
        discount_type: 'fixed',
        discount_value: 500,     // $5.00 off
        is_active: true,
        max_uses: 100,
        current_uses: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c0000003-0000-4000-8000-000000000003',
        code: 'SUMMER25',
        discount_type: 'percentage',
        discount_value: 25,
        is_active: true,
        max_uses: 50,
        current_uses: 48,        // almost exhausted
        created_at: now,
        updated_at: now,
      },
      {
        id: 'c0000004-0000-4000-8000-000000000004',
        code: 'EXPIRED20',
        discount_type: 'percentage',
        discount_value: 20,
        is_active: false,         // deactivated coupon
        max_uses: null,
        current_uses: 0,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('coupons', null, {});
  },
};
