import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import store from './store/store';
import './i18n';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1F2937',
              color: '#FFFFFF',
              borderRadius: '0.5rem',
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
