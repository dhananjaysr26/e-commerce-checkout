'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('products', [
      {
        id: 'a0000001-0000-4000-8000-000000000001',
        name: 'Wireless Bluetooth Headphones',
        description: 'Over-ear noise-cancelling headphones with 30-hour battery life.',
        unit_price_minor: 7999,   // $79.99
        inventory: 150,
        version: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a0000002-0000-4000-8000-000000000002',
        name: 'USB-C Fast Charger (65W)',
        description: 'GaN compact charger compatible with laptops, phones, and tablets.',
        unit_price_minor: 3499,   // $34.99
        inventory: 300,
        version: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a0000003-0000-4000-8000-000000000003',
        name: 'Mechanical Keyboard (TKL)',
        description: 'Tenkeyless mechanical keyboard with hot-swappable switches and RGB.',
        unit_price_minor: 12999,  // $129.99
        inventory: 75,
        version: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a0000004-0000-4000-8000-000000000004',
        name: 'Ergonomic Mouse',
        description: 'Vertical ergonomic wireless mouse with adjustable DPI.',
        unit_price_minor: 4999,   // $49.99
        inventory: 200,
        version: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a0000005-0000-4000-8000-000000000005',
        name: '4K Webcam',
        description: 'Ultra HD webcam with auto-focus, privacy shutter, and dual mic.',
        unit_price_minor: 8999,   // $89.99
        inventory: 100,
        version: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a0000006-0000-4000-8000-000000000006',
        name: 'Laptop Stand (Aluminium)',
        description: 'Adjustable aluminium laptop stand for improved posture.',
        unit_price_minor: 2999,   // $29.99
        inventory: 500,
        version: 0,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', null, {});
  },
};
