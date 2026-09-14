const cartRepository = require('../repositories/cart.repository');
const productRepository = require('../repositories/product.repository');
const AppError = require('../errors/AppError');
const errorCodes = require('../errors/errorCodes');

class CartService {
  async getOrCreateActiveCart(userId) {
    let cart = await cartRepository.findOpenCartByUserId(userId);
    if (!cart) {
      cart = await cartRepository.createCart(userId);
      // Refetch to include empty items array consistently
      cart = await cartRepository.findCartById(cart.id);
    }
    return this._mapToResponse(cart);
  }

  async getCart(cartId, userId) {
    const cart = await cartRepository.findCartById(cartId);
    if (!cart) {
      throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
    }
    if (cart.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN_CART_ACCESS');
    }
    return this._mapToResponse(cart);
  }

  async addCartItem(cartId, userId, productId, quantity) {
    // Basic validation is handled by Zod in the handler, but business rules here
    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than zero', 400, 'INVALID_QUANTITY');
    }

    const cart = await cartRepository.findCartById(cartId);
    if (!cart) {
      throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
    }
    if (cart.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN_CART_ACCESS');
    }
    if (cart.status !== 'open') {
      throw new AppError('Cart is no longer active', 400, 'CART_ALREADY_CHECKED_OUT');
    }

    const product = await productRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const existingItem = await cartRepository.findCartItem(cartId, productId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await cartRepository.updateCartItemQuantity(existingItem.id, newQuantity);
    } else {
      await cartRepository.addCartItem(cartId, productId, quantity);
    }

    // Return the updated cart
    return await this.getCart(cartId, userId);
  }

  _mapToResponse(cart) {
    const items = (cart.CartItems || []).map(item => {
      const product = item.Product || {};
      return {
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unitPriceMinor: product.unitPriceMinor,
        lineTotalMinor: product.unitPriceMinor * item.quantity,
      };
    });

    return {
      id: cart.id,
      status: cart.status.toUpperCase(),
      items,
    };
  }
}

module.exports = new CartService();
