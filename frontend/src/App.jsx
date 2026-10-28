import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout imports
import { MainLayout, VendorLayout, AdminLayout, AuthLayout } from './layouts';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy-loaded storefront & customer pages
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));

// Lazy-loaded auth pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Lazy-loaded vendor pages
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const VendorProducts = lazy(() => import('./pages/VendorProducts'));
const VendorOrders = lazy(() => import('./pages/VendorOrders'));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminVendors = lazy(() => import('./pages/AdminVendors'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));

// Lazy-loaded 404 page
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * ProtectedRoute component
 * Ensures the user is authenticated via Redux auth state.
 * Redirects unauthenticated visitors to /login with redirect query param.
 */
function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

/**
 * RoleRoute component
 * Ensures the user is authenticated and possesses the required role (e.g. 'vendor' or 'admin').
 * If unauthorized, redirects to default storefront.
 */
function RoleRoute({ role, children }) {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const userRole = user?.role?.toLowerCase();
  const allowedRole = role?.toLowerCase();

  // Allow system admin to access or match required role
  const isAuthorized = userRole === allowedRole || (allowedRole === 'vendor' && userRole === 'admin');

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* ================= PUBLIC STOREFRONT ROUTES (MainLayout) ================= */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/shop"
          element={
            <MainLayout>
              <Shop />
            </MainLayout>
          }
        />
        <Route
          path="/products/:id"
          element={
            <MainLayout>
              <ProductDetail />
            </MainLayout>
          }
        />

        {/* ================= AUTH ROUTES (AuthLayout) ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ================= PROTECTED CUSTOMER / RETAILER ROUTES (MainLayout) ================= */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Cart />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Orders />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <OrderDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Wallet />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ================= VENDOR MANAGEMENT ROUTES (VendorLayout, vendor only) ================= */}
        <Route
          path="/vendor"
          element={<Navigate to="/vendor/dashboard" replace />}
        />
        <Route
          path="/vendor/dashboard"
          element={
            <RoleRoute role="vendor">
              <VendorLayout>
                <VendorDashboard />
              </VendorLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/vendor/products"
          element={
            <RoleRoute role="vendor">
              <VendorLayout>
                <VendorProducts />
              </VendorLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <RoleRoute role="vendor">
              <VendorLayout>
                <VendorOrders />
              </VendorLayout>
            </RoleRoute>
          }
        />

        {/* ================= ADMIN MANAGEMENT ROUTES (AdminLayout, admin only) ================= */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminVendors />
              </AdminLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminOrders />
              </AdminLayout>
            </RoleRoute>
          }
        />

        {/* ================= 404 NOT FOUND ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
