import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveCart, selectCart, selectCartStatus, selectCartError, selectCartItemCount } from './cartSlice';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import { Loading, ErrorMessage, EmptyState } from '../../components/common';

const Cart = () => {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const status = useSelector(selectCartStatus);
  const error = useSelector(selectCartError);
  const itemCount = useSelector(selectCartItemCount);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchActiveCart());
    }
  }, [status, dispatch]);

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-6 sm:px-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-medium text-gray-900" id="slide-over-title">
            Shopping cart {itemCount > 0 && `(${itemCount})`}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {status === 'loading' && <Loading />}
        {status === 'failed' && <ErrorMessage message={error} />}
        
        {status === 'succeeded' && (!cart?.items || cart.items.length === 0) && (
          <EmptyState title="Your cart is empty" description="Add some products to see them here." />
        )}

        {status === 'succeeded' && cart?.items?.length > 0 && (
          <div className="flow-root">
            <ul role="list" className="-my-6 divide-y divide-gray-200">
              {cart.items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <CartSummary />
    </div>
  );
};

export default Cart;
