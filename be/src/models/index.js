const { sequelize } = require('../db/sequelize');
const { DataTypes } = require('sequelize');

// Load models
const User = require('./User')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Cart = require('./Cart')(sequelize, DataTypes);
const CartItem = require('./CartItem')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Coupon = require('./Coupon')(sequelize, DataTypes);
const IdempotencyKey = require('./IdempotencyKey')(sequelize, DataTypes);

// ── Associations ──

// User → Carts (one-to-many; a user may have many carts over time)
User.hasMany(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });

// User → Orders
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Cart → CartItems
Cart.hasMany(CartItem, { foreignKey: 'cartId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

// Product → CartItems
Product.hasMany(CartItem, { foreignKey: 'productId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

// Cart → Order (one-to-one via UNIQUE(cart_id) on orders)
Cart.hasOne(Order, { foreignKey: 'cartId' });
Order.belongsTo(Cart, { foreignKey: 'cartId' });

// Order → OrderItems
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// Product → OrderItems
Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

// Coupon → Orders (optional)
Coupon.hasMany(Order, { foreignKey: 'appliedCouponId' });
Order.belongsTo(Coupon, { foreignKey: 'appliedCouponId' });

// IdempotencyKey associations
User.hasMany(IdempotencyKey, { foreignKey: 'userId' });
IdempotencyKey.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(IdempotencyKey, { foreignKey: 'cartId' });
IdempotencyKey.belongsTo(Cart, { foreignKey: 'cartId' });

Order.hasMany(IdempotencyKey, { foreignKey: 'orderId' });
IdempotencyKey.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Coupon,
  IdempotencyKey,
};
