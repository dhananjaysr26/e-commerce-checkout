module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    cartId: { type: DataTypes.UUID, allowNull: false, unique: true },
    grossAmountMinor: { type: DataTypes.INTEGER, allowNull: false },
    discountAmountMinor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    netAmountMinor: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), allowNull: false, defaultValue: 'pending' },
    appliedCouponId: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
  });
};
