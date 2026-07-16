import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from './Footer';
import OfflineBanner from './OfflineBanner';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-100 dark:bg-neutral-950 text-charcoal-900 dark:text-neutral-50 transition-colors duration-300">
      <OfflineBanner />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
