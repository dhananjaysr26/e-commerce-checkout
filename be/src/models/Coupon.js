module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Coupon', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    discountType: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
    discountValue: { type: DataTypes.INTEGER, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maxUses: { type: DataTypes.INTEGER, allowNull: true },
    currentUses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'coupons',
    underscored: true,
    timestamps: true,
  });
};
