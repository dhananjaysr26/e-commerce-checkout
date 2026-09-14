import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api';

export const fetchActiveCart = createAsyncThunk(
  'cart/fetchActiveCart',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getOrCreateCart();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ cartId, productId, quantity }, { rejectWithValue }) => {
    try {
      return await api.addCartItem(cartId, productId, quantity);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkoutCart = createAsyncThunk(
  'cart/checkoutCart',
  async ({ cartId, paymentMethodId, couponCode }, { rejectWithValue }) => {
    try {
      const idempotencyKey = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      return await api.checkoutCart(cartId, paymentMethodId, couponCode, idempotencyKey);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cart: null,
    status: 'idle',
    error: null,
    addStatus: 'idle',
    checkoutStatus: 'idle',
    checkoutError: null,
    lastOrder: null,
  },
  reducers: {
    resetCheckoutStatus(state) {
      state.checkoutStatus = 'idle';
      state.checkoutError = null;
      state.lastOrder = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchActiveCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(fetchActiveCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addToCart.pending, (state) => {
        state.addStatus = 'loading';
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.addStatus = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.addStatus = 'failed';
        state.error = action.payload;
      })
      .addCase(checkoutCart.pending, (state) => {
        state.checkoutStatus = 'loading';
        state.checkoutError = null;
      })
      .addCase(checkoutCart.fulfilled, (state, action) => {
        state.checkoutStatus = 'succeeded';
        state.lastOrder = action.payload;
        state.cart = null; // Cart is converted
      })
      .addCase(checkoutCart.rejected, (state, action) => {
        state.checkoutStatus = 'failed';
        state.checkoutError = action.payload;
      });
  },
});

export const { resetCheckoutStatus } = cartSlice.actions;

export default cartSlice.reducer;

export const selectCart = (state) => state.cart.cart;
export const selectCartStatus = (state) => state.cart.status;
export const selectCartAddStatus = (state) => state.cart.addStatus;
export const selectCartError = (state) => state.cart.error;

export const selectCartItemCount = (state) => {
  if (!state.cart.cart || !state.cart.cart.items) return 0;
  return state.cart.cart.items.reduce((total, item) => total + item.quantity, 0);
};

export const selectCartSubtotal = (state) => {
  if (!state.cart.cart || !state.cart.cart.items) return 0;
  return state.cart.cart.items.reduce((total, item) => total + item.lineTotalMinor, 0);
};
