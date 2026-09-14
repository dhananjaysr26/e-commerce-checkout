const productService = require('../../services/product.service');
const { success } = require('../../utils/response');
const { withErrorHandler } = require('../../middleware/errorHandler');

const getProducts = async (event) => {
  const products = await productService.getProducts();
  return success({ data: products });
};

module.exports.handler = withErrorHandler(getProducts);
