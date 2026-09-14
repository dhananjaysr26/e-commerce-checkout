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

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cart: null,
    status: 'idle',
    error: null,
    addStatus: 'idle',
  },
  reducers: {},
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
      });
  },
});

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
