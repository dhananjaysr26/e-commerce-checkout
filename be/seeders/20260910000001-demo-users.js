'use strict';

const crypto = require('crypto');

const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alice@example.com',
        password_hash: hashPassword('password123'),
        role: 'customer',
        reward_points: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'bob@example.com',
        password_hash: hashPassword('password123'),
        role: 'customer',
        reward_points: 50,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'admin@example.com',
        password_hash: hashPassword('admin123'),
        role: 'admin',
        reward_points: 0,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
