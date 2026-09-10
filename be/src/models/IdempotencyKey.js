module.exports = (sequelize, DataTypes) => {
  return sequelize.define('IdempotencyKey', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    cartId: { type: DataTypes.UUID, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    requestHash: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('started', 'completed', 'failed'), allowNull: false, defaultValue: 'started' },
    orderId: { type: DataTypes.UUID, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'idempotency_keys',
    underscored: true,
    timestamps: true,
  });
};
