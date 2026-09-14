import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatMoney } from '../../utils/money';
import { addToCart, updateCartItem, removeCartItem, selectCart } from '../cart/cartSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  
  const [isUpdating, setIsUpdating] = useState(false);

  const cartItem = cart?.items?.find(i => i.productId === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  
  // Adjusted available stock considering what's already in the cart isn't strictly necessary, 
  // but it's good UX to disable 'plus' if we reach the max inventory.
  const isOutOfStock = product.inventory === 0;
  const isMaxReached = quantityInCart >= product.inventory;

  const handleAction = async (actionFn) => {
    if (!cart?.id) return;
    setIsUpdating(true);
    await dispatch(actionFn);
    setIsUpdating(false);
  };

  const handleAddToCart = () => {
    handleAction(addToCart({ cartId: cart.id, productId: product.id, quantity: 1 }));
  };

  const handleIncrement = () => {
    if (isMaxReached) return;
    handleAction(updateCartItem({ cartId: cart.id, productId: product.id, quantity: quantityInCart + 1 }));
  };

  const handleDecrement = () => {
    if (quantityInCart <= 1) {
      handleAction(removeCartItem({ cartId: cart.id, productId: product.id }));
    } else {
      handleAction(updateCartItem({ cartId: cart.id, productId: product.id, quantity: quantityInCart - 1 }));
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
        {quantityInCart > 0 ? (
          <div className="flex items-center justify-between">
            <button
              onClick={handleDecrement}
              disabled={isUpdating}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <span className="text-sm font-medium text-gray-900">
              {isUpdating ? '...' : quantityInCart}
            </span>
            <button
              onClick={handleIncrement}
              disabled={isUpdating || isMaxReached}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isUpdating || !cart}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Adding...' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
