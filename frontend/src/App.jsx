import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import ProductDetail from './pages/ProductDetail';
import AuthPage from './pages/AuthPage';
import DisputeDetail from './pages/DisputeDetail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="min-h-screen pt-20 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-300">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<AuthPage defaultMode="login" />} />
            <Route path="/register" element={<AuthPage defaultMode="register" />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/disputes/:ticketId" element={<DisputeDetail />} />
            </Route>
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
