import React from 'react';
import { useSelector } from 'react-redux';
import { selectCartItemCount, selectCartSubtotal } from './cartSlice';
import { formatMoney } from '../../utils/money';

const CartSummary = () => {
  const itemCount = useSelector(selectCartItemCount);
  const subtotal = useSelector(selectCartSubtotal);

  if (itemCount === 0) return null;

  return (
    <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
      <div className="flex justify-between text-base font-medium text-gray-900">
        <p>Subtotal</p>
        <p>{formatMoney(subtotal)}</p>
      </div>
      <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
      <div className="mt-6">
        <button
          disabled
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 opacity-50 cursor-not-allowed hover:bg-indigo-700"
        >
          Checkout coming next
        </button>
      </div>
    </div>
  );
};

export default CartSummary;
