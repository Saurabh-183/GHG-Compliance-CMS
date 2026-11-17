'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { formatDate } from '@/lib/utils';
import { notify } from '@/lib/notify';
import type { ClientUploadListItem } from '@/app/api/client-uploads/route';
import type { IDataset } from '@/types';
import { ClientDocumentPreviewPanel } from '@/components/previews/ClientDocumentPreviewPanel';
import {
  FolderTree,
  Link2,
  MapPin,
  CheckCircle2,
  XCircle,
  Filter,
  ExternalLink,
  Eye,
  CloudUpload,
  AlertCircle,
} from 'lucide-react';

interface ClientUploadsPanelProps {
  facilityId?: string;
  compact?: boolean;
  title?: string;
}

export const ClientUploadsPanel: React.FC<ClientUploadsPanelProps> = ({
  facilityId,
  compact = false,
  title = 'Client Document Uploads (Google Drive Vault)',
}) => {
  const [uploads, setUploads] = useState<ClientUploadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [mappingItem, setMappingItem] = useState<ClientUploadListItem | null>(null);
  const [datasets, setDatasets] = useState<IDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClientUploadListItem | null>(null);
  const [vaultRootUrl, setVaultRootUrl] = useState('https://drive.google.com/drive/shared-with-me');
  const [autoUploadEnabled, setAutoUploadEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/drive/vault-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) {
          setVaultRootUrl(json.data.vaultRootFolderUrl || json.data.sharedWithMeUrl);
          setAutoUploadEnabled(Boolean(json.data.autoUploadEnabled));
        }
      })
      .catch(() => undefined);
  }, []);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (facilityId) params.set('facilityId', facilityId);
      if (statusFilter !== 'ALL') params.set('mappingStatus', statusFilter);
      const res = await fetch(`/api/client-uploads?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { data: ClientUploadListItem[] };
        setUploads(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [facilityId, statusFilter]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  const openMapping = async (item: ClientUploadListItem) => {
    setMappingItem(item);
    setSelectedDatasetId(item.mappedDatasetId || '');
    setSelectedMonth(item.mappedMonth || '');
    setNotes(item.verificationNotes || '');
    try {
      const res = await fetch(`/api/datasets?facilityId=${encodeURIComponent(item.facilityId)}`);
      if (res.ok) {
        const json = (await res.json()) as { data: IDataset[] };
        setDatasets(json.data || []);
        if (!item.mappedDatasetId && json.data?.[0]) {
          setSelectedDatasetId(json.data[0]._id);
        }
      }
    } catch {
      setDatasets([]);
    }
  };

  const selectedDataset = datasets.find((d) => d._id === selectedDatasetId);
  const monthOptions = selectedDataset?.months?.map((m) => m.month) || [];

  const submitMapping = async (action: 'map' | 'verify' | 'reject') => {
    if (!mappingItem) return;
    if ((action === 'map' || action === 'verify') && selectedDatasetId && !selectedMonth) {
      notify.warning('Select a billing month to map this document');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/requirements/${mappingItem.requirementId}/submissions/${mappingItem.linkIndex}/map`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            datasetId: selectedDatasetId || undefined,
            month: selectedMonth || undefined,
            verificationNotes: notes,
          }),
        }
      );
      if (res.ok) {
        notify.success(
          action === 'reject'
            ? 'Document rejected — client notified via requirement status'
            : action === 'verify'
              ? 'Document verified and mapped'
              : 'Document mapped to dataset'
        );
        setMappingItem(null);
        await loadUploads();
      } else {
        notify.error('Could not update mapping');
      }
    } catch {
      notify.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const displayRows = compact ? uploads.slice(0, 5) : uploads;

  if (loading) {
    return <CarbonCrunchLoader message="Loading client vault uploads..." />;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Files from the client portal are stored under{' '}
            <code className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Client_Submissions/…
            </code>{' '}
            in the shared compliance Drive (
            <a
              href="https://drive.google.com/drive/shared-with-me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Shared with me
            </a>
            ).
          </p>
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border ${
              autoUploadEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
            }`}
          >
            {autoUploadEnabled ? (
              <>
                <CloudUpload className="w-3 h-3" /> Automatic upload to shared Drive is ON
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" /> Configure service account in .env for automatic Drive copy
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending mapping</option>
            <option value="MAPPED">Mapped</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {!compact && (
            <a
              href={vaultRootUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Open vault <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {previewDoc && (
        <ClientDocumentPreviewPanel item={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {displayRows.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No client Drive uploads yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3">Facility / Request</th>
                <th className="py-2.5 px-3">Vault path</th>
                <th className="py-2.5 px-3">Submitted</th>
                <th className="py-2.5 px-3 text-center">Mapping</th>
                <th className="py-2.5 px-3 text-center">Preview</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {displayRows.map((row) => (
                <tr
                  key={`${row.requirementId}-${row.linkIndex}`}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{row.requirementTitle}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {row.facilityId} · {row.period}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{row.submittedBy}</div>
                  </td>
                  <td className="py-3 px-3 max-w-[200px]">
                    <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 line-clamp-2">
                      {row.vaultFolderPath || 'Indexed in vault'}
                    </div>
                    {row.vaultCategory && (
                      <span className="text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {row.vaultCategory}
                      </span>
                    )}
                    {row.vaultFolderUrl && (
                      <a
                        href={row.vaultFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] mt-1 block text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Open folder in Drive →
                      </a>
                    )}
                    {row.ingestionMode === 'DRIVE_API_COPIED' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        Copied to shared vault
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(row.submittedAt)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.mappingStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : row.mappingStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : row.mappingStatus === 'MAPPED'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {row.mappingStatus || 'PENDING'}
                    </span>
                    {row.mappedMonth && (
                      <div className="text-[9px] text-slate-500 mt-1">→ {row.mappedMonth}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <DriveLinkBadge url={row.vaultUrl || row.url} label={row.fileName || 'Client doc'} />
                    {row.sourceUrl && row.sourceUrl !== row.vaultUrl && (
                      <span className="block mt-1">
                        <DriveLinkBadge url={row.sourceUrl} label="Original" className="opacity-80" />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-[10px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Eye className="w-3 h-3" />
                        View in UI
                      </button>
                      <button
                        type="button"
                        onClick={() => openMapping(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#17365D] dark:bg-[#A56F63] text-white text-[10px] font-bold hover:opacity-90"
                      >
                        <MapPin className="w-3 h-3" />
                        Map / Verify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compact && uploads.length > 5 && (
        <div className="text-right">
          <Link href="/client-uploads" className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
            View all {uploads.length} uploads →
          </Link>
        </div>
      )}

      {mappingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  Map client document to verification
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">{mappingItem.requirementTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMappingItem(null)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-[10px] font-mono text-emerald-300 bg-slate-950 p-2 rounded border border-slate-800">
              {mappingItem.vaultFolderPath}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[11px] text-slate-300 space-y-1">
                Dataset
                <select
                  value={selectedDatasetId}
                  onChange={(e) => {
                    setSelectedDatasetId(e.target.value);
                    setSelectedMonth('');
                  }}
                  className="w-full text-xs rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white"
                >
                  <option value="">— Select dataset —</option>
                  {datasets.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.datasetType} ({d.period})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-slate-300 space-y-1">
                Billing month
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white"
                  disabled={!selectedDatasetId}
                >
                  <option value="">— Month —</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-[11px] text-slate-300 space-y-1 block">
              Verification notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white"
                placeholder="Optional notes for audit trail…"
              />
            </label>

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => submitMapping('reject')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/50 text-rose-300 text-xs font-semibold hover:bg-rose-950/40"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => submitMapping('map')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600"
              >
                <MapPin className="w-3.5 h-3.5" /> Map only
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => submitMapping('verify')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Verify & map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};