const { Product } = require('../models');

class ProductRepository {
  async findAll() {
    return await Product.findAll({
      order: [['created_at', 'ASC']],
    });
  }

  async findById(productId) {
    return await Product.findByPk(productId);
  }
}

module.exports = new ProductRepository();
