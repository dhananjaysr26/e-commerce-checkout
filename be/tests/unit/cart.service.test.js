const cartService = require('../../src/services/cart.service');
const cartRepository = require('../../src/repositories/cart.repository');
const productRepository = require('../../src/repositories/product.repository');
const AppError = require('../../src/errors/AppError');

describe('CartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateActiveCart', () => {
    it('should return existing active cart if it exists', async () => {
      const mockCart = { id: 'cart-1', status: 'open', CartItems: [] };
      vi.spyOn(cartRepository, 'findOpenCartByUserId').mockResolvedValue(mockCart);
      vi.spyOn(cartRepository, 'createCart').mockResolvedValue(null);

      const result = await cartService.getOrCreateActiveCart('user-1');

      expect(cartRepository.findOpenCartByUserId).toHaveBeenCalledWith('user-1');
      expect(cartRepository.createCart).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'cart-1', status: 'OPEN', items: [] });
    });

    it('should create and return a new cart if no active cart exists', async () => {
      vi.spyOn(cartRepository, 'findOpenCartByUserId').mockResolvedValue(null);
      vi.spyOn(cartRepository, 'createCart').mockResolvedValue({ id: 'cart-2' });
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue({ id: 'cart-2', status: 'open', CartItems: [] });

      const result = await cartService.getOrCreateActiveCart('user-2');

      expect(cartRepository.findOpenCartByUserId).toHaveBeenCalledWith('user-2');
      expect(cartRepository.createCart).toHaveBeenCalledWith('user-2');
      expect(cartRepository.findCartById).toHaveBeenCalledWith('cart-2');
      expect(result).toEqual({ id: 'cart-2', status: 'OPEN', items: [] });
    });
  });

  describe('getCart', () => {
    it('should throw an error if cart is not found', async () => {
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(null);
      await expect(cartService.getCart('cart-1', 'user-1')).rejects.toThrow(AppError);
      await expect(cartService.getCart('cart-1', 'user-1')).rejects.toThrow('Cart not found');
    });

    it('should throw an error if cart belongs to another user', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-2' };
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);
      await expect(cartService.getCart('cart-1', 'user-1')).rejects.toThrow('Forbidden');
    });

    it('should return mapped cart if valid', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        status: 'open',
        CartItems: [
          { productId: 'p1', quantity: 2, Product: { name: 'P1', unitPriceMinor: 100 } }
        ]
      };
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);

      const result = await cartService.getCart('cart-1', 'user-1');
      expect(result).toEqual({
        id: 'cart-1',
        status: 'OPEN',
        items: [
          { productId: 'p1', name: 'P1', quantity: 2, unitPriceMinor: 100, lineTotalMinor: 200 }
        ]
      });
    });
  });

  describe('addCartItem', () => {
    it('should throw if quantity is <= 0', async () => {
      await expect(cartService.addCartItem('cart-1', 'user-1', 'p1', 0)).rejects.toThrow('Quantity must be greater than zero');
    });

    it('should throw if cart is no longer active', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-1', status: 'checked_out' };
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);
      await expect(cartService.addCartItem('cart-1', 'user-1', 'p1', 1)).rejects.toThrow('Cart is no longer active');
    });

    it('should throw if product not found', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-1', status: 'open' };
      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);
      vi.spyOn(productRepository, 'findById').mockResolvedValue(null);
      await expect(cartService.addCartItem('cart-1', 'user-1', 'p1', 1)).rejects.toThrow('Product not found');
    });

    it('should update quantity if item already in cart', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-1', status: 'open', CartItems: [] };
      const mockProduct = { id: 'p1' };
      const mockExistingItem = { id: 'item-1', quantity: 2 };

      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct);
      vi.spyOn(cartRepository, 'findCartItem').mockResolvedValue(mockExistingItem);
      vi.spyOn(cartRepository, 'updateCartItemQuantity').mockResolvedValue();

      await cartService.addCartItem('cart-1', 'user-1', 'p1', 3);

      expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith('item-1', 5);
    });

    it('should add new item if not in cart', async () => {
      const mockCart = { id: 'cart-1', userId: 'user-1', status: 'open', CartItems: [] };
      const mockProduct = { id: 'p1' };

      vi.spyOn(cartRepository, 'findCartById').mockResolvedValue(mockCart);
      vi.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct);
      vi.spyOn(cartRepository, 'findCartItem').mockResolvedValue(null);
      vi.spyOn(cartRepository, 'addCartItem').mockResolvedValue();

      await cartService.addCartItem('cart-1', 'user-1', 'p1', 3);

      expect(cartRepository.addCartItem).toHaveBeenCalledWith('cart-1', 'p1', 3);
    });
  });
});
