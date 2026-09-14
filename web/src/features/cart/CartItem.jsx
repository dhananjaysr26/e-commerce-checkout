import React from 'react';
import { formatMoney } from '../../utils/money';

const CartItem = ({ item }) => {
  return (
    <li className="flex py-6">
      <div className="ml-4 flex-1 flex flex-col">
        <div>
          <div className="flex justify-between text-base font-medium text-gray-900">
            <h3>{item.name}</h3>
            <p className="ml-4">{formatMoney(item.lineTotalMinor)}</p>
          </div>
          <p className="mt-1 text-sm text-gray-500">{formatMoney(item.unitPriceMinor)} each</p>
        </div>
        <div className="flex-1 flex items-end justify-between text-sm">
          <p className="text-gray-500">Qty {item.quantity}</p>
        </div>
      </div>
    </li>
  );
};

export default CartItem;
