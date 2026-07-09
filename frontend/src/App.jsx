import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import AuthPage from './pages/AuthPage';
import DisputeDetail from './pages/DisputeDetail';
import UserProfile from './pages/UserProfile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="min-h-screen bg-[hsl(40,20%,97%)] text-[hsl(12,14%,11%)]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<AuthPage defaultMode="login" />} />
            <Route path="/register" element={<AuthPage defaultMode="register" />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/disputes/:ticketId" element={<DisputeDetail />} />
              <Route path="/profile" element={<UserProfile />} />
            </Route>
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
