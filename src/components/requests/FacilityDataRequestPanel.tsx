'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Plus, Send } from 'lucide-react';
import type { ComplianceType, IDataRequirement } from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { StatusBadge } from '@/components/common/StatusBadge';
import { notify } from '@/lib/notify';

const COMPLIANCE_OPTIONS: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

interface FacilityDataRequestPanelProps {
  facilityId: string;
  facilityName?: string;
  period?: string;
  className?: string;
}

export function FacilityDataRequestPanel({
  facilityId,
  facilityName,
  period = DEFAULT_CHECKLIST_PERIOD,
  className = '',
}: FacilityDataRequestPanelProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC'>('COMPLIANCE_SPECIFIC');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>(['PAT', 'RCO']);
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ facilityId, period });
      const res = await fetch(`/api/requirements?${q.toString()}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load requests');
      setRequirements(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error(e);
      notify.error('Could not load facility data requests');
    } finally {
      setLoading(false);
    }
  }, [facilityId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleCompliance = (value: ComplianceType) => {
    setLinkedCompliances((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const submitRequest = async () => {
    if (!title.trim() || !description.trim()) {
      notify.error('Enter a title and description for the client request.');
      return;
    }
    if (linkedCompliances.length === 0) {
      notify.error('Select at least one compliance framework.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          facilityId,
          period,
          title: title.trim(),
          description: description.trim(),
          category,
          linkedCompliances,
          dueDate: dueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      notify.success(json.message || 'Data request sent to client for this facility');
      setTitle('');
      setDescription('');
      setDueDate('');
      await load();
    } catch (e) {
      console.error(e);
      notify.error(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = requirements.filter((r) =>
    ['REQUESTED', 'PARTIALLY_RECEIVED'].includes(r.submissionStatus)
  ).length;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4 ${className}`}
    >
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          Request Report / Data — Client Portal
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>
            Scoped to <strong className="font-mono text-emerald-700 dark:text-emerald-400">{facilityId}</strong>
            {facilityName ? ` (${facilityName})` : ''} · {period}
          </span>
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Clients see requests only for facilities they are authorized to access. Use &quot;Send to Client&quot; on the checklist
          to bulk-publish all Due rows as requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
        <div className="space-y-2">
          <label className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Request title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Grid Bills — Q1 FY26"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          >
            <option value="COMMON_ENERGY">Common energy data</option>
            <option value="COMPLIANCE_SPECIFIC">Compliance-specific report</option>
          </select>
        </div>
        <div className="lg:col-span-2 space-y-2">
          <label className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Instructions for client
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What to upload, format, and reporting period covered…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Due date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            Linked frameworks
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPLIANCE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCompliance(c)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors ${
                  linkedCompliances.includes(c)
                    ? 'bg-emerald-700 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void submitRequest()}
        disabled={submitting}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-60"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Send data request to client (this facility)
      </button>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Active requests for {facilityId}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{openCount} open</span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : requirements.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No portal requests for this facility yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 max-h-48 overflow-y-auto text-xs">
            {requirements.slice(0, 12).map((req) => (
              <li key={req._id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{req.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{req.period}</div>
                </div>
                <StatusBadge status={req.submissionStatus} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}