import React, { memo } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

/**
 * MainLayout component
 * Primary layout wrapper for storefront / marketplace customer pages.
 * Features sticky Navbar, dynamic content area (supports children or Outlet), and Footer.
 */
const MainLayout = memo(function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-gray-900 transition-colors">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
});

export default MainLayout;
