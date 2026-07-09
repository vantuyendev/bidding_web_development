import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function UserSettings(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const { user } = useAuth();
  
  if (!profileData) return null;

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-750 flex items-center justify-center ring-2 ring-neutral-200 dark:ring-neutral-850 shadow-sm select-none">
          <span className="text-3xl font-black text-neutral-600 dark:text-neutral-300 uppercase">
            {profileData.email ? profileData.email[0] : '?'}
          </span>
        </div>
        
        {/* User metadata */}
        <div className="text-center sm:text-left space-y-1.5 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {profileData.email ? profileData.email.split('@')[0] : 'Người dùng'}
            </h2>
            {profileData.isVerifiedSeller ? (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                ✓ Người bán Xác thực
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-700/30">
                Khách hàng đấu giá
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">{profileData.email}</p>
          <p className="text-[10px] text-neutral-400 font-mono">ID: {profileData.id}</p>
        </div>
      </div>

      {/* Điểm Tín nhiệm (Trust Score) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Rating score */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Điểm Tín nhiệm</span>
            <div className="text-xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1 mt-0.5">
              {Number(profileData.reputationScore || 0).toFixed(1)}
              <span className="text-xs text-neutral-400 font-bold">/ 5.0</span>
            </div>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
              />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giao dịch Thành công</span>
            <div className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
              {profileData._count?.soldProducts || 0}
              <span className="text-xs text-neutral-400 font-bold ml-1">đơn hàng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
