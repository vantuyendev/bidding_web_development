import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from './Footer';
import OfflineBanner from './OfflineBanner';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(40,20%,97%)] text-[hsl(12,14%,11%)]">
      <OfflineBanner />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
