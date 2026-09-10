module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Cart', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('open', 'checked_out', 'abandoned'), allowNull: false, defaultValue: 'open' },
  }, {
    tableName: 'carts',
    underscored: true,
    timestamps: true,
  });
};
