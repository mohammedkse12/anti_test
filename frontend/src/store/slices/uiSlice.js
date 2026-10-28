import { createSlice } from '@reduxjs/toolkit';
import i18n from '../../i18n';

const getInitialLanguage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('foodx_lng') || localStorage.getItem('i18nextLng');
    if (saved && (saved.startsWith('en') || saved.startsWith('ar'))) {
      return saved.startsWith('ar') ? 'ar' : 'en';
    }
  }
  return 'ar';
};

const initialState = {
  language: getInitialLanguage(),
  sidebarOpen: false,
  cartDrawerOpen: false,
};

const applyLanguage = (newLang) => {
  if (i18n && typeof i18n.changeLanguage === 'function') {
    i18n.changeLanguage(newLang);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('foodx_lng', newLang);
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleLanguage: (state) => {
      const nextLang = state.language === 'ar' ? 'en' : 'ar';
      state.language = nextLang;
      applyLanguage(nextLang);
    },
    setLanguage: (state, action) => {
      const lang = action.payload === 'en' ? 'en' : 'ar';
      state.language = lang;
      applyLanguage(lang);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = Boolean(action.payload);
    },
    toggleCartDrawer: (state) => {
      state.cartDrawerOpen = !state.cartDrawerOpen;
    },
    setCartDrawerOpen: (state, action) => {
      state.cartDrawerOpen = Boolean(action.payload);
    },
  },
});

export const {
  toggleLanguage,
  setLanguage,
  toggleSidebar,
  setSidebarOpen,
  toggleCartDrawer,
  setCartDrawerOpen,
} = uiSlice.actions;

export const selectLanguage = (state) => state.ui.language;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectCartDrawerOpen = (state) => state.ui.cartDrawerOpen;

export default uiSlice.reducer;
