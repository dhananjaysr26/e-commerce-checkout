const productRepository = require('../repositories/product.repository');

class ProductService {
  async getProducts() {
    const products = await productRepository.findAll();
    return products.map(product => this._mapToResponse(product));
  }

  _mapToResponse(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      unitPriceMinor: product.unitPriceMinor,
      currency: 'INR',
      inventory: product.inventory,
    };
  }
}

module.exports = new ProductService();
