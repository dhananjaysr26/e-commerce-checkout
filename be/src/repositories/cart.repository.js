const { Cart, CartItem, Product } = require('../models');

class CartRepository {
  async findOpenCartByUserId(userId) {
    return await Cart.findOne({
      where: { userId, status: 'open' },
      include: [
        {
          model: CartItem,
          include: [Product],
        },
      ],
      order: [[CartItem, 'created_at', 'ASC']],
    });
  }

  async findCartById(cartId) {
    return await Cart.findByPk(cartId, {
      include: [
        {
          model: CartItem,
          include: [Product],
        },
      ],
      order: [[CartItem, 'created_at', 'ASC']],
    });
  }

  async createCart(userId) {
    return await Cart.create({
      userId,
      status: 'open',
    });
  }

  async findCartItem(cartId, productId) {
    return await CartItem.findOne({
      where: { cartId, productId },
    });
  }

  async addCartItem(cartId, productId, quantity) {
    return await CartItem.create({
      cartId,
      productId,
      quantity,
    });
  }

  async updateCartItemQuantity(cartItemId, quantity) {
    await CartItem.update({ quantity }, { where: { id: cartItemId } });
  }

  async removeCartItem(cartItemId) {
    await CartItem.destroy({ where: { id: cartItemId } });
  }
}

module.exports = new CartRepository();
