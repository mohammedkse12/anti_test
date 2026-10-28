import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const getInitialCartItems = () => {
  try {
    const saved = localStorage.getItem('foodx_cart');
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Error reading cart from localStorage', err);
    return [];
  }
};

const calculateTotals = (items) => {
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price || item.product?.price || 0);
    const qty = Number(item.quantity) || 1;
    return sum + price * qty;
  }, 0);
  return { totalItems, subtotal };
};

const initialItems = typeof localStorage !== 'undefined' ? getInitialCartItems() : [];
const { totalItems: initialTotalItems, subtotal: initialSubtotal } = calculateTotals(initialItems);

const initialState = {
  items: initialItems,
  loading: false,
  error: null,
  totalItems: initialTotalItems,
  subtotal: initialSubtotal,
};

const syncCartToStorage = (items) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('foodx_cart', JSON.stringify(items));
  }
};

// Async Thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cart');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : data.items || [];
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch cart';
      return rejectWithValue(message);
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ product, productId, quantity = 1 }, { getState, rejectWithValue }) => {
    try {
      const targetId = productId || product?._id || product?.id;
      const response = await api.post('/cart/items', { productId: targetId, quantity });
      return response.data?.data || response.data;
    } catch (error) {
      // In case backend endpoint is not reachable yet, allow optimistic update with fallback
      if (product) {
        return { product, quantity, optimistic: true };
      }
      const message = error.response?.data?.message || error.message || 'Failed to add item to cart';
      return rejectWithValue(message);
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/cart/items/${itemId}`, { quantity });
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update item quantity');
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/cart/items/${itemId}`);
      return { itemId, responseData: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove item from cart');
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete('/cart');
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to clear cart');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItemLocal: (state, action) => {
      const item = action.payload;
      const id = item.productId || item._id || item.id;
      const existing = state.items.find(
        (i) => (i.productId || i.product?._id || i._id || i.id) === id
      );

      if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + (Number(item.quantity) || 1);
      } else {
        state.items.push({
          ...item,
          productId: id,
          quantity: Number(item.quantity) || 1,
        });
      }

      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.subtotal = totals.subtotal;
      syncCartToStorage(state.items);
    },
    removeItemLocal: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter(
        (i) => (i._id || i.id || i.productId || i.product?._id) !== id
      );
      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.subtotal = totals.subtotal;
      syncCartToStorage(state.items);
    },
    updateQuantityLocal: (state, action) => {
      const { itemId, quantity } = action.payload;
      const target = state.items.find(
        (i) => (i._id || i.id || i.productId || i.product?._id) === itemId
      );
      if (target) {
        target.quantity = Math.max(1, Number(quantity) || 1);
      }
      const totals = calculateTotals(state.items);
      state.totalItems = totals.totalItems;
      state.subtotal = totals.subtotal;
      syncCartToStorage(state.items);
    },
    clearCartLocal: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.subtotal = 0;
      state.error = null;
      syncCartToStorage([]);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        const newItems = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.items || [];
        state.items = newItems;
        const totals = calculateTotals(newItems);
        state.totalItems = totals.totalItems;
        state.subtotal = totals.subtotal;
        syncCartToStorage(newItems);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add to Cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (payload?.items && Array.isArray(payload.items)) {
          state.items = payload.items;
        } else if (payload?.optimistic && payload.product) {
          const prod = payload.product;
          const id = prod._id || prod.id;
          const existing = state.items.find(
            (i) => (i.productId || i.product?._id || i._id) === id
          );
          if (existing) {
            existing.quantity += Number(payload.quantity) || 1;
          } else {
            state.items.push({
              _id: `temp_${Date.now()}`,
              productId: id,
              product: prod,
              price: prod.price,
              quantity: Number(payload.quantity) || 1,
            });
          }
        } else if (payload && (payload._id || payload.product)) {
          const id = payload.productId || payload.product?._id || payload._id;
          const index = state.items.findIndex(
            (i) => (i.productId || i.product?._id || i._id) === id
          );
          if (index >= 0) {
            state.items[index] = payload;
          } else {
            state.items.push(payload);
          }
        }
        const totals = calculateTotals(state.items);
        state.totalItems = totals.totalItems;
        state.subtotal = totals.subtotal;
        syncCartToStorage(state.items);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Cart Item
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload?.items) {
          state.items = payload.items;
        } else if (payload?._id) {
          const index = state.items.findIndex((i) => i._id === payload._id);
          if (index >= 0) {
            state.items[index] = payload;
          }
        }
        const totals = calculateTotals(state.items);
        state.totalItems = totals.totalItems;
        state.subtotal = totals.subtotal;
        syncCartToStorage(state.items);
      })

      // Remove from Cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        const { itemId, responseData } = action.payload;
        if (responseData?.items) {
          state.items = responseData.items;
        } else {
          state.items = state.items.filter(
            (i) => i._id !== itemId && i.productId !== itemId && i.product?._id !== itemId
          );
        }
        const totals = calculateTotals(state.items);
        state.totalItems = totals.totalItems;
        state.subtotal = totals.subtotal;
        syncCartToStorage(state.items);
      })

      // Clear Cart
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
        state.totalItems = 0;
        state.subtotal = 0;
        state.loading = false;
        syncCartToStorage([]);
      });
  },
});

export const {
  addItemLocal,
  removeItemLocal,
  updateQuantityLocal,
  clearCartLocal,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartLoading = (state) => state.cart.loading;
export const selectCartError = (state) => state.cart.error;
export const selectTotalItems = (state) => state.cart.totalItems;
export const selectCartSubtotal = (state) => state.cart.subtotal;

export default cartSlice.reducer;
