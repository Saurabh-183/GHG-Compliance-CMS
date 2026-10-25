'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Carbon Crunch</span>
          <span>·</span>
          <span>Compliance Metadata & Verification Platform v1.0</span>
        </div>
        <div>Source evidence documents stored securely on Google Drive</div>
      </div>
    </footer>
  );
};
