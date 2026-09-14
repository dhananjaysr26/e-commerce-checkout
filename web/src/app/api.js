const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function fetchApi(endpoint, options = {}) {
  // Temporary: In a real app we'd attach a JWT token here.
  // The backend uses a demo user if auth is missing.
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error?.message || 'An error occurred',
      response.status,
      data.error?.code || 'UNKNOWN_ERROR'
    );
  }

  return data.data;
}

export const api = {
  getProducts: () => fetchApi('/products'),
  getOrCreateCart: () => fetchApi('/carts', { method: 'POST' }),
  getCart: (cartId) => fetchApi(`/carts/${cartId}`),
  addCartItem: (cartId, productId, quantity) => 
    fetchApi(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  updateCartItem: (cartId, productId, quantity) => 
    fetchApi(`/carts/${cartId}/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (cartId, productId) => 
    fetchApi(`/carts/${cartId}/items/${productId}`, {
      method: 'DELETE',
    }),
  checkoutCart: (cartId, paymentMethodId, couponCode, idempotencyKey) => 
    fetchApi(`/carts/${cartId}/checkout`, {
      method: 'POST',
      headers: {
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({ paymentMethodId, couponCode }),
    }),
  getCoupons: () => fetchApi('/me/coupons'),
};
