'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reward_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: {
        type: Sequelize.ENUM('ORDER_REWARDED', 'MILESTONE_REACHED'),
        allowNull: false
      },
      milestone: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('reward_events', ['user_id', 'order_id', 'event_type'], {
      unique: true,
      name: 'reward_events_user_order_type_unique'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reward_events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reward_events_event_type" CASCADE;');
  }
};
