import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import AuthPage from './pages/AuthPage';
import DisputeDetail from './pages/DisputeDetail';
import UserProfile from './pages/UserProfile';
import CatalogPage from './pages/catalog/CatalogPage';

// Dashboard pages
import UserSettings from './pages/dashboard/UserSettings';
import WalletDashboard from './pages/dashboard/WalletDashboard';
import BidHistory from './pages/dashboard/BidHistory';
import SellerListings from './pages/dashboard/SellerListings';
import Watchlist from './pages/dashboard/Watchlist';
import KycSubmission from './pages/dashboard/KycSubmission';
import UserDisputes from './pages/dashboard/UserDisputes';

// Admin pages
import KycApproval from './pages/admin/KycApproval';
import DisputeManagement from './pages/admin/DisputeManagement';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes — full-screen, no navbar */}
            <Route path="/login" element={<AuthPage defaultMode="login" />} />
            <Route path="/register" element={<AuthPage defaultMode="register" />} />

            {/* All other routes inside MainLayout (Header/Navbar, Footer) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<CatalogPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              
              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/disputes/:ticketId" element={<DisputeDetail />} />
                
                {/* Profile Dashboard Layout and Sub-Routes */}
                <Route path="/profile" element={<UserProfile />}>
                  <Route index element={<UserSettings />} />
                  <Route path="wallet" element={<WalletDashboard />} />
                  <Route path="bids" element={<BidHistory />} />
                  <Route path="listings" element={<SellerListings />} />
                  <Route path="watchlist" element={<Watchlist />} />
                  <Route path="kyc" element={<KycSubmission />} />
                  <Route path="disputes" element={<UserDisputes />} />
                </Route>

                {/* Admin Sections */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/kyc" element={<KycApproval />} />
                  <Route path="/admin/disputes" element={<DisputeManagement />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
