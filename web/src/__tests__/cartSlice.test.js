import { describe, it, expect } from 'vitest';
import reducer, { selectCartItemCount, selectCartSubtotal } from '../features/cart/cartSlice';

describe('cartSlice selectors', () => {
  const initialState = {
    cart: {
      items: [
        { productId: 'p1', quantity: 2, lineTotalMinor: 2000 },
        { productId: 'p2', quantity: 1, lineTotalMinor: 1500 }
      ]
    }
  };

  it('selectCartItemCount calculates correctly', () => {
    expect(selectCartItemCount({ cart: initialState })).toBe(3);
  });

  it('selectCartSubtotal calculates correctly', () => {
    expect(selectCartSubtotal({ cart: initialState })).toBe(3500);
  });

  it('returns 0 for empty cart', () => {
    const emptyState = { cart: { items: [] } };
    expect(selectCartItemCount({ cart: emptyState })).toBe(0);
    expect(selectCartSubtotal({ cart: emptyState })).toBe(0);
  });
});
