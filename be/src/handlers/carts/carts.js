const cartService = require('../../services/cart.service');
const { success } = require('../../utils/response');
const { withErrorHandler } = require('../../middleware/errorHandler');
const { withAuth } = require('../../middleware/auth');
const { addCartItemSchema } = require('../../schemas/cart.schema');
const AppError = require('../../errors/AppError');

// Get or Create Active Cart
const getOrCreateCart = async (event) => {
  const userId = event.user.id;
  const cart = await cartService.getOrCreateActiveCart(userId);
  return success({ data: cart });
};

// Get specific Cart
const getCart = async (event) => {
  const userId = event.user.id;
  const { cartId } = event.pathParameters || {};
  const cart = await cartService.getCart(cartId, userId);
  return success({ data: cart });
};

// Add item to Cart
const addCartItem = async (event) => {
  const userId = event.user.id;
  const { cartId } = event.pathParameters || {};
  
  if (!event.body) {
    throw new AppError('Request body is required', 400, 'VALIDATION_ERROR');
  }

  const parsedBody = JSON.parse(event.body);
  const validatedData = addCartItemSchema.parse(parsedBody);

  const cart = await cartService.addCartItem(
    cartId,
    userId,
    validatedData.productId,
    validatedData.quantity
  );

  return success({ data: cart }, 201);
};

// Update Cart Item
const updateCartItem = async (event) => {
  const userId = event.user.id;
  const { cartId, productId } = event.pathParameters || {};
  
  if (!event.body) {
    throw new AppError('Request body is required', 400, 'VALIDATION_ERROR');
  }

  const parsedBody = JSON.parse(event.body);
  const validatedData = require('../../schemas/cart.schema').updateCartItemSchema.parse(parsedBody);

  const cart = await cartService.updateCartItem(
    cartId,
    userId,
    productId,
    validatedData.quantity
  );

  return success({ data: cart }, 200);
};

// Remove Cart Item
const removeCartItem = async (event) => {
  const userId = event.user.id;
  const { cartId, productId } = event.pathParameters || {};
  
  const cart = await cartService.removeCartItem(cartId, userId, productId);

  return success({ data: cart }, 200);
};

module.exports = {
  getOrCreateCart: withErrorHandler(withAuth(getOrCreateCart)),
  getCart: withErrorHandler(withAuth(getCart)),
  addCartItem: withErrorHandler(withAuth(addCartItem)),
  updateCartItem: withErrorHandler(withAuth(updateCartItem)),
  removeCartItem: withErrorHandler(withAuth(removeCartItem)),
};
