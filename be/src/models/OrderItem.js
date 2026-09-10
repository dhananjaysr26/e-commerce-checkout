module.exports = (sequelize, DataTypes) => {
  return sequelize.define('OrderItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPriceMinor: { type: DataTypes.INTEGER, allowNull: false },
    lineTotalMinor: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'order_items',
    underscored: true,
    timestamps: true,
  });
};
