'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface CarbonCrunchLoaderProps {
  label?: string;
  message?: string;
  sublabel?: string;
  fullPage?: boolean;
}

export const CarbonCrunchLoader: React.FC<CarbonCrunchLoaderProps> = ({
  label,
  message,
  sublabel = 'Connecting to regulatory metadata layer...',
  fullPage = false,
}) => {
  const displayLabel = message || label || 'Loading compliance data...';
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullPage ? 'min-h-[70vh] w-full' : 'py-16 w-full'
      }`}
    >
      <div className="relative flex items-center justify-center w-14 h-14">
        {/* Minimalist Orbiting Track */}
        <div className="absolute inset-0 rounded-full border border-slate-800 border-t-emerald-600 animate-spin"></div>

        {/* Center Carbon Crunch Shield Logo */}
        <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 z-10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Text with animated ellipsis */}
      <div className="mt-4 text-center space-y-0.5">
        <p className="text-xs font-medium text-slate-300 tracking-wide">
          {displayLabel}
        </p>
        {sublabel && (
          <p className="text-[11px] text-slate-500">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
};
