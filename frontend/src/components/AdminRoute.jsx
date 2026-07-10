import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col justify-start p-6 md:p-12 animate-pulse select-none">
        <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4"></div>
        <div className="h-10 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-4"></div>
        <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
      </div>
    );
  }

  const isAdmin = user?.isAdmin === true;

  if (!user || !isAdmin) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}
