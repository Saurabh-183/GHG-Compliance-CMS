'use client';

import React from 'react';
import { ClientUploadsPanel } from '@/components/uploads/ClientUploadsPanel';
import { useAuth } from '@/context/AuthContext';

export default function ClientUploadsPage() {
  const { currentRole, currentUser } = useAuth();

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Client Drive Vault — Document Mapping
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Client Drive links are auto-copied into your shared vault with folder structure. Review
          uploads here, view documents in the UI, and map them to monthly reconciliation records.
          Visible to{' '}
          <strong className="text-emerald-700 dark:text-emerald-400">
            {currentRole === 'ADMIN' ? 'Administrators' : 'Consultants & Administrators'}
          </strong>
          {currentUser?.name ? ` · ${currentUser.name}` : ''}.
        </p>
      </div>

      <ClientUploadsPanel />
    </div>
  );
}