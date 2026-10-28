import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Helper to safely load stored JSON
const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
};

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
const storedRefreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
const storedUser = typeof localStorage !== 'undefined' ? getStoredUser() : null;

const initialState = {
  user: storedUser,
  token: storedToken,
  refreshToken: storedRefreshToken,
  isAuthenticated: Boolean(storedToken),
  loading: false,
  error: null,
};

const saveAuthToStorage = (token, refreshToken, user) => {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

const clearAuthFromStorage = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Async Thunks
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/send-otp', { phone });
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to send OTP';
      return rejectWithValue(message);
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, otp }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp });
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Invalid or expired OTP';
      return rejectWithValue(message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const currentRefreshToken = getState().auth.refreshToken || localStorage.getItem('refreshToken');
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await api.post('/auth/refresh', { refreshToken: currentRefreshToken });
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Token refresh failed';
      return rejectWithValue(message);
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data?.data || response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch user profile';
      return rejectWithValue(message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API notification failed, clearing local session anyway.', error);
    } finally {
      clearAuthFromStorage();
    }
    return true;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      state.user = user || state.user;
      state.token = token || state.token;
      state.refreshToken = refreshToken || state.refreshToken;
      state.isAuthenticated = Boolean(state.token);
      state.error = null;
      saveAuthToStorage(state.token, state.refreshToken, state.user);
    },
    logoutSync: (state) => {
      clearAuthFromStorage();
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        const { user, token, refreshToken: rToken } = action.payload || {};
        if (token) {
          state.user = user || null;
          state.token = token;
          state.refreshToken = rToken || null;
          state.isAuthenticated = true;
          saveAuthToStorage(token, rToken, user);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        const { user, token, refreshToken: rToken } = action.payload || {};
        if (token) {
          state.user = user || null;
          state.token = token;
          state.refreshToken = rToken || null;
          state.isAuthenticated = true;
          saveAuthToStorage(token, rToken, user);
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        const { user, token, refreshToken: rToken } = action.payload || {};
        state.user = user || null;
        state.token = token || null;
        state.refreshToken = rToken || null;
        state.isAuthenticated = Boolean(token);
        if (token) {
          saveAuthToStorage(token, rToken, user);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        const { token, refreshToken: rToken } = action.payload || {};
        if (token) {
          state.token = token;
          if (rToken) state.refreshToken = rToken;
          saveAuthToStorage(token, rToken || state.refreshToken, state.user);
        }
      })
      .addCase(refreshToken.rejected, (state, action) => {
        clearAuthFromStorage();
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      // Get Me
      .addCase(getMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        const user = action.payload?.user || action.payload;
        state.user = user;
        if (typeof localStorage !== 'undefined' && user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, setCredentials, logoutSync } = authSlice.actions;
export default authSlice.reducer;
