'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('coupons', 'milestone', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('coupons', 'status', {
      type: Sequelize.ENUM('available', 'redeemed'),
      allowNull: false,
      defaultValue: 'available'
    });

    await queryInterface.addColumn('coupons', 'redeemed_order_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('coupons', 'redeemed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('coupons', 'redeemed_at');
    await queryInterface.removeColumn('coupons', 'redeemed_order_id');
    await queryInterface.removeColumn('coupons', 'status');
    // NOTE: Drop enum type 'enum_coupons_status' as well in PG
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_coupons_status" CASCADE;');
    await queryInterface.removeColumn('coupons', 'milestone');
  }
};
