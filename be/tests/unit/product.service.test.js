const productService = require('../../src/services/product.service');
const productRepository = require('../../src/repositories/product.repository');

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return a list of mapped products', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'Product 1',
          description: 'Desc 1',
          unitPriceMinor: 1000,
          inventory: 10,
        },
        {
          id: 2,
          name: 'Product 2',
          description: 'Desc 2',
          unitPriceMinor: 2000,
          inventory: 5,
        },
      ];

      vi.spyOn(productRepository, 'findAll').mockResolvedValue(mockProducts);

      const result = await productService.getProducts();

      expect(productRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Product 1',
        description: 'Desc 1',
        unitPriceMinor: 1000,
        currency: 'INR',
        inventory: 10,
      });
      expect(result[1]).toEqual({
        id: 2,
        name: 'Product 2',
        description: 'Desc 2',
        unitPriceMinor: 2000,
        currency: 'INR',
        inventory: 5,
      });
    });

    it('should handle empty product list', async () => {
      vi.spyOn(productRepository, 'findAll').mockResolvedValue([]);
      const result = await productService.getProducts();
      expect(productRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });
});
