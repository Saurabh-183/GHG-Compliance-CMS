'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function FormSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
  step,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  step: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17365D] dark:bg-emerald-700 !text-white text-xs font-bold shadow-xs select-none"
          style={{ color: '#FFFFFF' }}
        >
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">{children}</div>}
    </section>
  );
}