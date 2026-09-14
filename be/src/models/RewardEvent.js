module.exports = (sequelize, DataTypes) => {
  return sequelize.define('RewardEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false },
    eventType: { type: DataTypes.ENUM('ORDER_REWARDED', 'MILESTONE_REACHED'), allowNull: false },
    milestone: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'reward_events',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'order_id', 'event_type'],
        name: 'reward_events_user_order_type_unique'
      }
    ]
  });
};
