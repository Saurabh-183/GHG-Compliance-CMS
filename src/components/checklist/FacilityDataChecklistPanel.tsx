'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  ClipboardList,
  Download,
  Loader2,
  Plus,
  Save,
  Send,
  Square,
  Trash2,
} from 'lucide-react';
import type { ComplianceType, DataChecklistItemStatus, IFacilityDataChecklist, IFacilityDataChecklistItem } from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { notify } from '@/lib/notify';
import { Checkbox } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { ChecklistStatusSelectMui } from './ChecklistStatusSelectMui';

type Mode = 'internal' | 'client';

const STATUS_OPTIONS: { value: DataChecklistItemStatus; label: string }[] = [
  { value: 'DUE', label: 'Applicable / Due' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
  { value: 'NOT_REQUIRED', label: 'Not Required' },
  { value: 'NEEDS_VERIFICATION', label: 'Needs Verification' },
];

function statusPill(status: DataChecklistItemStatus) {
  switch (status) {
    case 'RECEIVED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'DUE':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800';
    case 'NOT_APPLICABLE':
    case 'NOT_REQUIRED':
      return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    case 'NEEDS_VERIFICATION':
      return 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

interface FacilityDataChecklistPanelProps {
  facilityId: string;
  facilityName?: string;
  mode: Mode;
  period?: string;
  className?: string;
}

export function FacilityDataChecklistPanel({
  facilityId,
  facilityName,
  mode,
  period = DEFAULT_CHECKLIST_PERIOD,
  className = '',
}: FacilityDataChecklistPanelProps) {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [checklist, setChecklist] = useState<IFacilityDataChecklist | null>(null);
  const [items, setItems] = useState<IFacilityDataChecklistItem[]>([]);
  const [consultantNotes, setConsultantNotes] = useState('');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>(['RCO']);
  const [dirty, setDirty] = useState(false);
  const [notShared, setNotShared] = useState(false);
  const [serverStaleHint, setServerStaleHint] = useState(false);
  const dirtyRef = useRef(false);
  const itemsRef = useRef(items);
  const consultantNotesRef = useRef(consultantNotes);
  const serverUpdatedAtRef = useRef<string | undefined>(undefined);

  const canEdit = mode === 'internal';

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    consultantNotesRef.current = consultantNotes;
  }, [consultantNotes]);

  const applyServerPayload = useCallback((data: IFacilityDataChecklist) => {
    serverUpdatedAtRef.current = data.updatedAt;
    setNotShared(false);
    setChecklist(data);
    setItems(data.items.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    setConsultantNotes(data.consultantNotes || '');
    setDirty(false);
    setServerStaleHint(false);
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const q = new URLSearchParams({ period, _: String(Date.now()) });
        if (facilityName) q.set('facilityName', facilityName);
        const res = await fetch(`/api/facilities/${facilityId}/data-checklist?${q.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load checklist');
        if (!json.data) {
          setNotShared(mode === 'client');
          setChecklist(null);
          setItems([]);
          return;
        }
        const data = json.data as IFacilityDataChecklist;
        if (opts?.silent && dirtyRef.current) {
          if (serverUpdatedAtRef.current && data.updatedAt !== serverUpdatedAtRef.current) {
            setServerStaleHint(true);
          }
          return;
        }
        if (opts?.silent && !dirtyRef.current && serverUpdatedAtRef.current === data.updatedAt) {
          return;
        }
        applyServerPayload(data);
      } catch (e) {
        console.error(e);
        if (!opts?.silent) notify.error('Could not load facility data checklist');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [applyServerPayload, facilityId, facilityName, mode, period]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const intervalMs = mode === 'internal' ? 8000 : 15000;
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, mode]);

  const summary = useMemo(() => {
    const received = items.filter((i) => i.status === 'RECEIVED').length;
    const due = items.filter((i) => i.status === 'DUE').length;
    const na = items.filter((i) => i.status === 'NOT_APPLICABLE' || i.status === 'NOT_REQUIRED').length;
    return { received, due, na, total: items.length };
  }, [items]);

  const updateItem = (index: number, patch: Partial<IFacilityDataChecklistItem>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const toggleReceived = (index: number) => {
    const row = items[index];
    const next: DataChecklistItemStatus = row.status === 'RECEIVED' ? 'DUE' : 'RECEIVED';
    const nextItems = items.map((r, i) => (i === index ? { ...r, status: next } : r));
    persistStatusChange(nextItems);
  };

  const addRow = () => {
    const nextOrder = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 1;
    setItems((prev) => [
      ...prev,
      {
        itemKey: `custom_${Date.now()}`,
        label: 'Custom report / data item',
        status: 'DUE',
        notes: '',
        sortOrder: nextOrder,
      },
    ]);
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const save = async (payload?: {
    items?: IFacilityDataChecklistItem[];
    consultantNotes?: string;
    quiet?: boolean;
  }) => {
    const itemsToSave = payload?.items ?? itemsRef.current;
    const notesToSave = payload?.consultantNotes ?? consultantNotesRef.current;
    setSaving(true);
    try {
      const res = await fetch(`/api/facilities/${facilityId}/data-checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'include',
        body: JSON.stringify({
          period,
          facilityName,
          consultantNotes: notesToSave,
          items: itemsToSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      applyServerPayload(json.data as IFacilityDataChecklist);
      if (!payload?.quiet) notify.success('Data checklist saved');
    } catch (e) {
      console.error(e);
      if (!payload?.quiet) notify.error('Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  const persistStatusChange = (nextItems: IFacilityDataChecklistItem[]) => {
    setItems(nextItems);
    setDirty(true);
    if (canEdit) {
      void save({ items: nextItems, quiet: true });
    }
  };

  const sendToClient = async () => {
    if (dirty) {
      await save();
    }
    setSending(true);
    try {
      const res = await fetch(`/api/facilities/${facilityId}/data-checklist/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ period, facilityName, linkedCompliances }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      setChecklist(json.data);
      notify.success(`Checklist published. ${json.requirementsCreated ?? 0} data request(s) are now visible to the client.`);
    } catch (e) {
      console.error(e);
      notify.error('Failed to send checklist to client');
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const q = new URLSearchParams({ period });
      if (facilityName) q.set('facilityName', facilityName);
      const res = await fetch(`/api/facilities/${facilityId}/data-checklist/pdf?${q.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'PDF download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Checklist_${facilityId}_${period}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      notify.error('Could not download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 flex items-center justify-center gap-2 text-sm text-slate-500 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading facility data checklist...
      </div>
    );
  }

  if (notShared) {
    return (
      <div
        className={`rounded-xl border border-slate-200 dark:border-dashed dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-6 text-sm text-slate-600 dark:text-slate-400 ${className}`}
      >
        Your consultant has not published the data checklist for this facility yet. You will receive a notification when it is shared.
      </div>
    );
  }

  if (!checklist && !items.length) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            Facility Data Collection Checklist
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {canEdit
              ? 'Manually mark reports received or due per facility — aligned with the master All-Clients checklist.'
              : 'Reports your consultant has marked as due or received for this facility.'}
            {' · '}
            <span className="font-mono">{period}</span>
          </p>
          {checklist?.sharedWithClient && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
              Shared with client
              {checklist.sharedAt ? ` · ${new Date(checklist.sharedAt).toLocaleString()}` : ''}
              {checklist.sharedByName ? ` · by ${checklist.sharedByName}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors shadow-2xs"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            Download PDF
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-50 transition-colors shadow-2xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                Save
              </button>

              <button
                type="button"
                onClick={sendToClient}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60 transition-colors shadow-sm"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send to Client
              </button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-0.5">
              Link requests to:
            </span>
            {(['RCO', 'PAT', 'CCTS', 'CEA'] as ComplianceType[]).map((code) => {
              const isChecked = linkedCompliances.includes(code);
              return (
                <label
                  key={code}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(event) =>
                      setLinkedCompliances((current) =>
                        event.target.checked
                          ? [...current, code]
                          : current.filter((item) => item !== code)
                      )
                    }
                    size="small"
                    sx={{
                      padding: 0,
                      color: isDark ? '#64748B' : '#94A3B8',
                      '&.Mui-checked': {
                        color: isDark ? '#34D399' : '#059669',
                      },
                    }}
                  />
                  <span className="font-mono text-xs font-semibold">{code}</span>
                </label>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {dirty ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            ) : checklist?.lastUpdatedByName ? (
              <span>
                Last saved by {checklist.lastUpdatedByName}
                {checklist.updatedAt ? ` · ${new Date(checklist.updatedAt).toLocaleString()}` : ''}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {serverStaleHint && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs p-3 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200">
          <span>Updated on another dashboard. Reload to see the latest checklist.</span>
          <button
            type="button"
            onClick={() => void load()}
            className="px-2.5 py-1 rounded-md bg-sky-700 text-white font-semibold hover:bg-sky-600"
          >
            Reload now
          </button>
        </div>
      )}


      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30">
          <div className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300">Due</div>
          <div className="text-lg font-bold text-amber-900 dark:text-amber-100">{summary.due}</div>
        </div>
        <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30">
          <div className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">Received</div>
          <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{summary.received}</div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50">
          <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">N/A or Not Required</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{summary.na}</div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50">
          <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">Total Rows</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{summary.total}</div>
        </div>
      </div>

      {canEdit && (
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Consultant notes (optional, visible to client when shared)
          </label>
          <textarea
            value={consultantNotes}
            onChange={(e) => {
              setConsultantNotes(e.target.value);
              setDirty(true);
            }}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs p-2.5 text-slate-800 dark:text-slate-200"
            placeholder="e.g. Please prioritize Grid Bills and Fuel Purchase for Q2..."
          />
        </div>
      )}

      {!canEdit && checklist?.consultantNotes?.trim() && (
        <div className="text-xs p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <strong className="text-slate-900 dark:text-white">Consultant note: </strong>
          {checklist.consultantNotes}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add custom row
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 max-h-[520px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/95">
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">✓</th>
              <th className="py-2.5 px-3 min-w-[240px]">Report / Data Item</th>
              <th className="py-2.5 px-3 w-36">Status</th>
              <th className="py-2.5 px-3 min-w-[160px]">Notes</th>
              {canEdit && <th className="py-2.5 px-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {items.map((row, index) => (
              <tr key={`${row.itemKey}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => toggleReceived(index)}
                      className="text-emerald-700 dark:text-emerald-400"
                      title="Toggle received"
                    >
                      {row.status === 'RECEIVED' ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <span className={`inline-block w-2 h-2 rounded-full ${row.status === 'RECEIVED' ? 'bg-emerald-500' : row.status === 'DUE' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  )}
                </td>
                <td className="py-2 px-3">
                  {canEdit ? (
                    <input
                      value={row.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 rounded px-1 py-0.5 text-slate-900 dark:text-white font-medium"
                    />
                  ) : (
                    <span className="font-medium text-slate-900 dark:text-white">{row.label}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {canEdit ? (
                    <ChecklistStatusSelectMui
                      value={row.status}
                      onChange={(status) => {
                        const nextItems = items.map((r, i) => (i === index ? { ...r, status } : r));
                        persistStatusChange(nextItems);
                      }}
                    />
                  ) : (
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${statusPill(row.status)}`}>
                      {STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {canEdit ? (
                    <input
                      value={row.notes || ''}
                      onChange={(e) => updateItem(index, { notes: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px]"
                    />
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">{row.notes || '—'}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-rose-600 hover:text-rose-500"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}