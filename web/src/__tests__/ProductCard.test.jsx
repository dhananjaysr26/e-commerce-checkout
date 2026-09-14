import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ProductCard from '../features/products/ProductCard';

const mockStore = configureStore([]);

describe('ProductCard component', () => {
  it('renders product correctly and enables Add to Cart', () => {
    const store = mockStore({
      cart: { cart: { id: 'c1' }, addStatus: 'idle' }
    });

    const product = {
      id: 'p1',
      name: 'Wireless Mouse',
      unitPriceMinor: 1599,
      inventory: 10
    };

    render(
      <Provider store={store}>
        <ProductCard product={product} />
      </Provider>
    );

    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).not.toBeDisabled();
  });

  it('disables Add to Cart when out of stock', () => {
    const store = mockStore({
      cart: { cart: { id: 'c1' }, addStatus: 'idle' }
    });

    const product = {
      id: 'p2',
      name: 'Sold Out Item',
      unitPriceMinor: 1000,
      inventory: 0
    };

    render(
      <Provider store={store}>
        <ProductCard product={product} />
      </Provider>
    );

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });
});
