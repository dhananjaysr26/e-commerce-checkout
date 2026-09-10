'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Create an active cart for Alice
    await queryInterface.bulkInsert('carts', [
      {
        id: 'b0000001-0000-4000-8000-000000000001',
        user_id: '11111111-1111-1111-1111-111111111111', // Alice
        status: 'open',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('cart_items', [
      {
        id: 'd0000001-0000-4000-8000-000000000001',
        cart_id: 'b0000001-0000-4000-8000-000000000001',
        product_id: 'a0000001-0000-4000-8000-000000000001', // Headphones
        quantity: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'd0000002-0000-4000-8000-000000000002',
        cart_id: 'b0000001-0000-4000-8000-000000000001',
        product_id: 'a0000006-0000-4000-8000-000000000006', // Laptop Stand
        quantity: 2,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cart_items', null, {});
    await queryInterface.bulkDelete('carts', null, {});
  },
};
