'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { useAuth } from '@/context/AuthContext';

type Item = { _id: string; assessmentId: string; facilityId: string; framework: string; templateId: string; period: string; status: string; requestMessage?: string; updatedAt?: string };

export default function ClientRegulatoryRequestsPage() {
  const { currentRole } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/regulatory-submissions', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load requests');
      setItems(payload.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load requests'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  if (loading) return <CarbonCrunchLoader message="Loading regulatory data requests..." />;
  if (currentRole !== 'CLIENT') return <div className="max-w-5xl mx-auto p-8 text-sm">This page is available to client accounts only.</div>;
  const label = (status: string) => status.replaceAll('_', ' ');
  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
      <div><div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Client data collection</div><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Regulatory summary-sheet requests</h1><p className="mt-1 text-sm text-slate-500">Complete the summary sheets requested by your consultant and submit your facility data for verification.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold"><RefreshCw size={14}/> Refresh</button>
    </header>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center"><FileSpreadsheet className="mx-auto mb-3 text-slate-400" size={30}/><h2 className="font-semibold">No regulatory requests yet</h2><p className="mt-1 text-sm text-slate-500">When your consultant requests an RCO, PAT or CCTS summary sheet, it will appear here.</p></div> : <div className="grid gap-4">{items.map(item => <article key={item._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-emerald-700">{item.framework}</span><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-semibold">{label(item.status)}</span></div><h2 className="mt-2 font-semibold text-slate-900 dark:text-white">{item.templateId.replaceAll('_', ' ')}</h2><p className="mt-1 text-xs text-slate-500">Facility: {item.facilityId} · Reporting period: {item.period}</p>{item.requestMessage && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.requestMessage}</p>}</div><Link href={`/portal/regulatory/${encodeURIComponent(item.assessmentId)}`} className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white">{['REQUESTED','DRAFT','RETURNED'].includes(item.status) ? 'Complete summary sheet' : 'View submission'}</Link></article>)}</div>}
  </main>;
}
