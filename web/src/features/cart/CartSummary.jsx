import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItemCount, selectCartSubtotal, selectCart, checkoutCart } from './cartSlice';
import { formatMoney } from '../../utils/money';
import { api } from '../../app/api';

const CartSummary = () => {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const itemCount = useSelector(selectCartItemCount);
  const subtotal = useSelector(selectCartSubtotal);
  const checkoutStatus = useSelector((state) => state.cart.checkoutStatus);
  const checkoutError = useSelector((state) => state.cart.checkoutError);
  const lastOrder = useSelector((state) => state.cart.lastOrder);

  const [couponCode, setCouponCode] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    // Fetch available coupons
    api.getCoupons()
      .then(coupons => setAvailableCoupons(coupons))
      .catch(err => console.error('Failed to fetch coupons', err));
  }, []);

  if (itemCount === 0 && !lastOrder) return null;

  if (lastOrder) {
    return (
      <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
        <h3 className="text-lg font-medium text-green-600">Checkout Successful!</h3>
        <p className="mt-2 text-sm text-gray-500">Order ID: {lastOrder.orderId}</p>
        <p className="mt-2 text-sm font-medium text-gray-900">Total Paid: {formatMoney(lastOrder.netAmountMinor)}</p>
        <p className="mt-4 text-sm text-gray-500">Thank you for your purchase.</p>
      </div>
    );
  }

  const handleCheckout = () => {
    if (cart?.id) {
      dispatch(checkoutCart({
        cartId: cart.id,
        paymentMethodId: 'pm_card_visa', // Mock payment method
        couponCode: couponCode || undefined
      }));
    }
  };

  return (
    <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
      <div className="flex justify-between text-base font-medium text-gray-900">
        <p>Subtotal</p>
        <p>{formatMoney(subtotal)}</p>
      </div>
      <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
      
      <div className="mt-4">
        <input 
          type="text" 
          placeholder="Coupon Code" 
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {availableCoupons.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700 mb-1">Available Coupons:</p>
            <div className="space-y-1">
              {availableCoupons.map(coupon => (
                <div 
                  key={coupon.id} 
                  onClick={() => setCouponCode(coupon.code)}
                  className="text-xs flex justify-between items-center p-2 bg-indigo-50 border border-indigo-100 rounded cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <span className="font-mono font-medium text-indigo-700">{coupon.code}</span>
                  <span className="text-indigo-600">{coupon.discountValue}% off</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {checkoutError && (
        <p className="mt-2 text-sm text-red-600">{checkoutError}</p>
      )}

      <div className="mt-6">
        <button
          onClick={handleCheckout}
          disabled={checkoutStatus === 'loading'}
          className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {checkoutStatus === 'loading' ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  );
};

export default CartSummary;
