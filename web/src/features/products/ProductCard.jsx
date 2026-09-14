import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatMoney } from '../../utils/money';
import { addToCart, selectCart, selectCartAddStatus } from '../cart/cartSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const addStatus = useSelector(selectCartAddStatus);

  const isOutOfStock = product.inventory === 0;

  const handleAddToCart = () => {
    if (cart) {
      dispatch(addToCart({ cartId: cart.id, productId: product.id, quantity: 1 }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="p-5 flex-grow">
        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">
            {formatMoney(product.unitPriceMinor)}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-800' : product.inventory < 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {isOutOfStock ? 'Out of stock' : product.inventory < 5 ? `Only ${product.inventory} left` : 'In stock'}
          </span>
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || addStatus === 'loading' || !cart}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addStatus === 'loading' ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
