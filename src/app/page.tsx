'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export default function HomePage() {
  const { currentRole, switchRole } = useAuth();

  const acceptanceSteps = [
    {
      step: '1-2',
      title: 'Trident Group & RBAC Roles',
      desc: 'Trident Paper complex, Yarn & Home Textiles divisions with Admin, Consultant, Reviewer & Client accounts.',
      link: '/clients',
      role: 'ADMIN',
      badge: 'RBAC Active',
    },
    {
      step: '3-4',
      title: 'Historical Compliance Matrix',
      desc: 'RCO FY24-25 approved shortfall (5 MU), Drive final report, PSERC acknowledgement & calculation workbook.',
      link: '/facilities/TRIDENT_PAPER',
      role: 'CONSULTANT',
      badge: 'Module 1',
    },
    {
      step: '5-6',
      title: 'Client Data Requests & Drive Links',
      desc: 'Client portal view for FY 2025-26 grid electricity data collection with Drive document submission.',
      link: '/portal/requests',
      role: 'CLIENT',
      badge: 'Client Portal',
    },
    {
      step: '7-8',
      title: 'Reconciliation Engine & Discrepancy',
      desc: 'June 2025 flagged (1,280,000 declared vs 1,265,000 bill -> 15,000 kWh variance, 1.186%) with 1-click email draft.',
      link: '/datasets/6adb9175b32c50edab95461f/verify',
      role: 'CONSULTANT',
      badge: 'Module 3 Demo',
    },
    {
      step: '9-11',
      title: 'Clarification Response & Approval',
      desc: 'Client response with revised evidence, resubmission to Reviewer Queue, and reviewer audit sign-off.',
      link: '/approvals',
      role: 'CONSULTANT',
      badge: 'Audit & Approval Queue',
    },
    {
      step: '12-13',
      title: 'Historical Comparison & Calendar',
      desc: 'Side-by-side YoY trajectory table, interactive bar charts, and compliance deadlines with extension log.',
      link: '/calendar',
      role: 'CONSULTANT',
      badge: 'Module 4 & 5',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 shadow-xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MVP v1.0 Presentation Ready</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Energy & Carbon <br />
            <span className="text-emerald-500">
              Compliance Management Platform
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Centralizing multi-facility compliance registers (RCO/RPO, PAT, CCTS, CEA),
            evidence-based reconciliation against Google Drive documents, reviewer audit approval queues, and restricted client visibility.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <span>Open Consultant Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/facilities/TRIDENT_PAPER"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors shadow-sm"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Trident Paper Matrix</span>
            </Link>

            <Link
              href="/portal"
              onClick={() => switchRole('CLIENT')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700    dark:text-white font-semibold text-sm border border-slate-700 transition-colors shadow-sm"
            >
              <span>Launch Client Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 13-Step Acceptance Test Demo Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Initial End-to-End Acceptance Test Walkthrough
            </h2>
            <p className="text-xs   mt-1">
              Click any milestone step below to jump directly into the live demonstrated module with pre-loaded Trident Group seed data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {acceptanceSteps.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              onClick={() => switchRole(item.role as any)}
              className="group p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-md"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                    Steps {item.step}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs   leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs   group-hover:text-emerald-400">
                <span>Switch to <strong>{item.role}</strong> & Test</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-2.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold    dark:text-white">Strict RBAC & Isolation</h4>
          <p className="text-[11px]   mt-1">
            Server-side authorization guarantees unapproved metrics and internal notes never leak to external clients.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="p-2 w-fit rounded-lg bg-emerald-950/60 text-emerald-400 mb-2.5">
            <Sliders className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold    dark:text-white">Reconciliation Engine</h4>
          <p className="text-[11px]   mt-1">
            Declared client Excel data reconciled against DISCOM bills with configurable tolerance and discrepancy flagging.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="p-2 w-fit rounded-lg bg-slate-800 text-slate-300 mb-2.5">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold    dark:text-white">Google Drive Linked</h4>
          <p className="text-[11px]   mt-1">
            Zero OCR friction for MVP; all primary evidence and reports reside securely on Google Drive with verified metadata.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 mb-2.5">
            <Calendar className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold    dark:text-white">Statutory Calendar</h4>
          <p className="text-[11px]   mt-1">
            Centralized calendar tracking regulatory due dates, internal deadlines, and recurring monthly CEA filings.
          </p>
        </div>
      </div>
    </div>
  );
}
