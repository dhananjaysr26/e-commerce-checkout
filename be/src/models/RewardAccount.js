module.exports = (sequelize, DataTypes) => {
  return sequelize.define('RewardAccount', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    successfulOrderCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'reward_accounts',
    underscored: true,
    timestamps: true,
  });
};
