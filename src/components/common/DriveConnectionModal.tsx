'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { notify } from '@/lib/notify';

interface DriveConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityId?: string;
  onSyncSuccess?: (result: {
    dataGivenPercentage: number;
    dataMatchedPercentage: number;
    totalMonths: number;
  }) => void;
}

export const DriveConnectionModal: React.FC<DriveConnectionModalProps> = ({
  isOpen,
  onClose,
  facilityId = 'TRIDENT_PAPER',
  onSyncSuccess,
}) => {
  const [folderUrl, setFolderUrl] = useState(
    'https://drive.google.com/drive/folders/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7'
  );
  const [folderName, setFolderName] = useState('Carbon Crunch · Compliance Documents & Evidence Vault');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    dataGivenPercentage?: number;
    dataMatchedPercentage?: number;
    totalMonths?: number;
  } | null>(null);

  // Fetch current drive connection state
  useEffect(() => {
    if (!isOpen) return;
    async function fetchConnection() {
      try {
        const res = await fetch(`/api/drive/connect?facilityId=${facilityId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setIsConnected(json.data.isConnected || false);
            if (json.data.folderUrl) setFolderUrl(json.data.folderUrl);
            if (json.data.folderName) setFolderName(json.data.folderName);
            if (json.data.spreadsheetUrl) setSpreadsheetUrl(json.data.spreadsheetUrl);
            if (json.data.lastSyncedAt) {
              setLastSynced(new Date(json.data.lastSyncedAt).toLocaleString('en-IN'));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching drive connection:', err);
      }
    }
    fetchConnection();
  }, [isOpen, facilityId]);

  if (!isOpen) return null;

  const handleSyncDrive = async () => {
    if (!folderUrl.trim()) {
      notify.warning('Please enter a valid Google Drive folder URL');
      return;
    }

    setIsSyncing(true);
    notify.info('Connecting to Google Drive repository and parsing compliance records...');

    try {
      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          folderUrl: folderUrl.trim(),
          folderName: folderName.trim(),
          spreadsheetUrl: spreadsheetUrl.trim(),
          datasetType: 'GRID_ELECTRICITY',
          period: 'FY2025-26',
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setIsConnected(true);
        setLastSynced(new Date().toLocaleString('en-IN'));
        setStats({
          dataGivenPercentage: json.data.dataGivenPercentage,
          dataMatchedPercentage: json.data.dataMatchedPercentage,
          totalMonths: json.data.totalMonths,
        });

        notify.success(
          `Google Drive Synchronized! Loaded ${json.data.totalMonths} months directly without database seeding.`
        );

        if (onSyncSuccess) {
          onSyncSuccess({
            dataGivenPercentage: json.data.dataGivenPercentage,
            dataMatchedPercentage: json.data.dataMatchedPercentage,
            totalMonths: json.data.totalMonths,
          });
        }
      } else {
        notify.error(json.error || 'Failed to sync with Google Drive');
      }
    } catch (e) {
      notify.error('Network error syncing with Google Drive');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyPreset = (presetName: string, presetFolder: string, presetSheet = '') => {
    setFolderName(presetName);
    setFolderUrl(presetFolder);
    setSpreadsheetUrl(presetSheet);
    notify.info(`Applied Drive preset: ${presetName}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Google Drive Live Connection & Direct Sync</span>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark: ">
                Facility: <strong className="text-slate-700 dark:text-slate-300">{facilityId}</strong> · Zero Database Seeding Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg   hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Information Notice */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
            <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs">Direct Drive Pipeline (PRD v1.0)</p>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                Connect your corporate Google Drive folder to synchronize monthly consumption logs and utility bills directly into the compliance register. Supporting evidence remains securely stored on Google Drive while reconciliation is handled seamlessly in-platform.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Quick Connect Google Drive Repositories:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'Carbon Crunch · Compliance Documents & Evidence Vault',
                    'https://drive.google.com/drive/folders/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7',
                    'https://docs.google.com/spreadsheets/d/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7_Grid_Log'
                  )
                }
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-emerald-500 text-left transition-colors text-[11px]"
              >
                <div className="font-bold text-slate-900 dark:text-white truncate">Official Compliance Drive</div>
                <div className="text-[10px] text-slate-500 mt-0.5">PSPCL Bills & Monthly Data</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'Trident Yarn · Renewable Solar & Open Access Vault',
                    'https://drive.google.com/drive/folders/2CwjNWt1YSA6oGNeLwCeCKhhnVVrqumct_Trident_Yarn',
                    'https://docs.google.com/spreadsheets/d/2CwjNWt1YSA6oGNeLwCeCKhhnVVrqumct_RE_Log'
                  )
                }
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-emerald-500 text-left transition-colors text-[11px]"
              >
                <div className="font-bold text-slate-900 dark:text-white truncate">Trident Yarn Vault</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Open-Access PPA & RECs</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'Trident Home Textiles · Fuel & Coal Invoices',
                    'https://drive.google.com/drive/folders/3DxkOXu2ZTB7pHOfMxDfDLjioWWsrvndu_Trident_Textiles',
                    'https://docs.google.com/spreadsheets/d/3DxkOXu2ZTB7pHOfMxDfDLjioWWsrvndu_Fuel_Log'
                  )
                }
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-emerald-500 text-left transition-colors text-[11px]"
              >
                <div className="font-bold text-slate-900 dark:text-white truncate">Trident Textiles Vault</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Coal Invoices & GCV Lab</div>
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Google Drive Vault Name:
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Trident Paper Compliance Repository"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                <span>Google Drive Master Folder Link:</span>
                {folderUrl && (
                  <a
                    href={folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs pr-10"
                />
                <Folder className="w-4 h-4   absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Google Sheets / Live Data Export Link (Optional for direct tabular sync):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs pr-10"
                />
                <FileSpreadsheet className="w-4 h-4   absolute right-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                If provided, monthly rows will be extracted directly from this Google Sheet and linked with the Drive bills.
              </p>
            </div>
          </div>

          {/* Stats if available */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:  font-semibold uppercase">
                  Data Given Percentage
                </span>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {stats.dataGivenPercentage}%
                </div>
                <p className="text-[10px] text-slate-500">
                  {stats.totalMonths} of 12 statutory months populated from Drive
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:  font-semibold uppercase">
                  Data Matched Percentage
                </span>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {stats.dataMatchedPercentage}%
                </div>
                <p className="text-[10px] text-slate-500">
                  Verified against Drive utility bill evidence
                </p>
              </div>
            </div>
          )}

          {lastSynced && (
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Last Synchronized: <strong>{lastSynced}</strong></span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">● Live Google Drive Pipeline Active</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold    dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSyncDrive}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing from Drive...' : 'Sync Directly from Google Drive'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

