import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col justify-start p-6 md:p-12 animate-pulse select-none">
        {/* Skeleton Top Bar */}
        <div className="flex justify-between items-center w-full max-w-7xl mx-auto mb-16 h-12 border-b border-neutral-200/40 dark:border-neutral-800/40 pb-4">
          <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
            <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
          </div>
        </div>

        {/* Skeleton Content Layout */}
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="h-10 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
            <div className="h-5 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/30 dark:border-neutral-800/30 p-6 flex flex-col justify-between">
              <div className="h-6 w-1/3 bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-10 w-full bg-neutral-300 dark:bg-neutral-700 rounded-xl"></div>
            </div>
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/30 dark:border-neutral-800/30 p-6 flex flex-col justify-between">
              <div className="h-6 w-1/3 bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-10 w-full bg-neutral-300 dark:bg-neutral-700 rounded-xl"></div>
            </div>
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/30 dark:border-neutral-800/30 p-6 flex flex-col justify-between">
              <div className="h-6 w-1/3 bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700 rounded-lg"></div>
              <div className="h-10 w-full bg-neutral-300 dark:bg-neutral-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}
