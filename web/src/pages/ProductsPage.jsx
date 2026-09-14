import React from 'react';
import ProductList from '../features/products/ProductList';
import Cart from '../features/cart/Cart';

const ProductsPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">Product Catalog</h1>
          <ProductList />
        </div>
        <div className="lg:w-1/3">
          <div className="sticky top-8">
            <Cart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
