const checkoutService = require('../../src/services/checkout.service');
const models = require('../../src/models');
const AppError = require('../../src/errors/AppError');

describe('CheckoutService', () => {
  let mockTransaction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction = {
      LOCK: { UPDATE: 'UPDATE' },
      commit: vi.fn(),
      rollback: vi.fn(),
    };
    vi.spyOn(models.sequelize, 'transaction').mockResolvedValue(mockTransaction);
    vi.spyOn(models.sequelize, 'query').mockResolvedValue([ [null, 1] ]); // default

    vi.spyOn(models.IdempotencyKey, 'findOne');
    vi.spyOn(models.IdempotencyKey, 'create');
    vi.spyOn(models.IdempotencyKey, 'update');

    vi.spyOn(models.Cart, 'findOne');
    vi.spyOn(models.CartItem, 'findAll');
    
    vi.spyOn(models.Order, 'create');
    vi.spyOn(models.Order, 'findByPk');
    vi.spyOn(models.OrderItem, 'bulkCreate');
  });

  describe('processCheckout', () => {
    it('should throw if idempotency key reused with different request', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue({ requestHash: 'hash1', status: 'completed' });
      await expect(
        checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash2')
      ).rejects.toThrow('Idempotency key reused with different request');
    });

    it('should return existing order if idempotency key completed', async () => {
      const mockOrder = { id: 'order1' };
      models.IdempotencyKey.findOne.mockResolvedValue({ requestHash: 'hash1', status: 'completed', orderId: 'order1' });
      models.Order.findByPk.mockResolvedValue(mockOrder);

      const result = await checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1');
      expect(result).toBe(mockOrder);
    });

    it('should throw if cart not found', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue(null);
      models.IdempotencyKey.create.mockResolvedValue({});
      models.Cart.findOne.mockResolvedValue(null);

      await expect(
        checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1')
      ).rejects.toThrow('Cart not found');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw if cart is already checked out', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue(null);
      models.IdempotencyKey.create.mockResolvedValue({});
      models.Cart.findOne.mockResolvedValue({ status: 'checked_out' });

      await expect(
        checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1')
      ).rejects.toThrow('Cart is already checked out');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw if cart is empty', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue(null);
      models.IdempotencyKey.create.mockResolvedValue({});
      models.Cart.findOne.mockResolvedValue({ status: 'open' });
      models.CartItem.findAll.mockResolvedValue([]);

      await expect(
        checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1')
      ).rejects.toThrow('Cart is empty');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should process checkout successfully', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue(null);
      models.IdempotencyKey.create.mockResolvedValue({});
      
      const mockCart = { status: 'open', save: vi.fn() };
      models.Cart.findOne.mockResolvedValue(mockCart);
      
      models.CartItem.findAll.mockResolvedValue([
        { quantity: 2, Product: { id: 'p1', name: 'Product 1', unitPriceMinor: 1000 } }
      ]);

      models.Order.create.mockResolvedValue({ id: 'order1' });
      models.OrderItem.bulkCreate.mockResolvedValue([]);
      models.IdempotencyKey.update.mockResolvedValue({});

      const result = await checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1');

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual({ id: 'order1' });
      expect(mockCart.status).toBe('checked_out');
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('should throw if insufficient inventory', async () => {
      models.IdempotencyKey.findOne.mockResolvedValue(null);
      models.IdempotencyKey.create.mockResolvedValue({});
      models.Cart.findOne.mockResolvedValue({ status: 'open', save: vi.fn() });
      models.CartItem.findAll.mockResolvedValue([
        { quantity: 2, Product: { id: 'p1', name: 'Product 1', unitPriceMinor: 1000 } }
      ]);

      // Mock inventory update failure (rows affected = 0)
      models.sequelize.query.mockResolvedValueOnce([ [null, 0] ]);

      await expect(
        checkoutService.processCheckout('u1', 'c1', 'pm1', null, 'ikey', 'hash1')
      ).rejects.toThrow('Insufficient inventory for product: Product 1');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
