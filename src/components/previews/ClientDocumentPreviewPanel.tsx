'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import type { ClientUploadListItem } from '@/app/api/client-uploads/route';
import type { IPspclBillPreview } from '@/lib/pspclBillPreview';
import { getDrivePreviewEmbedUrl, parseGoogleDriveUrl } from '@/lib/driveVaultShared';
import { PspclBillPreviewCard } from './PspclBillPreviewCard';
import { IndustrialSubmissionPreviewCard } from './IndustrialSubmissionPreviewCard';
import type { SpreadsheetPreviewRow } from '@/lib/genericSpreadsheetPreview';
import { resolveClientEvidenceLabel, resolveClientEvidenceUrl } from '@/lib/clientUploadStatus';

interface ClientDocumentPreviewPanelProps {
  item: ClientUploadListItem;
  onClose: () => void;
  modal?: boolean;
  /** When true, show only the client Drive/Sheet embed (no parsed fields or workflow metadata). */
  variant?: 'full' | 'fileOnly';
}

function embedUrlFromClientLink(url: string): string | null {
  if (!url.trim()) return null;
  return getDrivePreviewEmbedUrl(url) || null;
}

function clientFileEmbedFallback(item: ClientUploadListItem, fileOnly: boolean): string | null {
  if (fileOnly) {
    const clientUrl = resolveClientEvidenceUrl({
      sourceUrl: item.sourceUrl,
      url: item.url,
      vaultUrl: item.vaultUrl,
    });
    return embedUrlFromClientLink(clientUrl);
  }
  if (item.vaultFileId) {
    return `https://drive.google.com/file/d/${item.vaultFileId}/preview`;
  }
  const urls = [item.sourceUrl, item.url, item.vaultUrl].filter(Boolean) as string[];
  for (const u of urls) {
    const parsed = parseGoogleDriveUrl(u);
    if (parsed.resourceType === 'file') {
      return getDrivePreviewEmbedUrl(u);
    }
  }
  return null;
}

export const ClientDocumentPreviewPanel: React.FC<ClientDocumentPreviewPanelProps> = ({
  item,
  onClose,
  modal = false,
  variant = 'full',
}) => {
  const fileOnly = variant === 'fileOnly';
  const [bill, setBill] = useState<IPspclBillPreview | null>(null);
  const [isElectricityBill, setIsElectricityBill] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(item.mappedMonth || '');
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [structuredRows, setStructuredRows] = useState<
    Array<{ key: string; label: string; value: string }>
  >([]);
  const [spreadsheetHeaders, setSpreadsheetHeaders] = useState<string[]>([]);
  const [spreadsheetRows, setSpreadsheetRows] = useState<SpreadsheetPreviewRow[]>([]);
  const [fieldReviews, setFieldReviews] = useState(item.fieldReviews);

  const loadPreview = async (preferredMonth?: string) => {
    setLoading(true);
    setParseError(null);
    try {
      const clientUrl = resolveClientEvidenceUrl({
        sourceUrl: item.sourceUrl,
        url: item.url,
        vaultUrl: item.vaultUrl,
      });

      const res = await fetch('/api/documents/submission-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          fileOnly
            ? {
                documentUrl: clientUrl || item.sourceUrl || item.url,
                driveFolderId: item.driveFolderId,
              }
            : {
                requirementId: item.requirementId,
                linkIndex: item.linkIndex,
                documentUrl: clientUrl || item.sourceUrl || item.url,
                vaultUrl: item.vaultUrl,
                vaultFileId: item.vaultFileId,
                driveFolderId: item.driveFolderId,
                preferredMonth: preferredMonth || undefined,
                facilityName: item.facilityName,
                facilityId: item.facilityId,
                dataCategory: item.dataCategory,
                requirementTitle: item.requirementTitle,
                sourceChecklistItemKey: item.sourceChecklistItemKey,
              }
        ),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          bill: IPspclBillPreview;
          isElectricityBill: boolean;
          availableMonths: string[];
          filePreviewEmbedUrl: string | null;
          openInDriveUrl: string | null;
          resolveNote?: string;
          parsedFromExcel: boolean;
          structuredRows: Array<{ key: string; label: string; value: string }>;
          spreadsheetHeaders: string[];
          spreadsheetRows: SpreadsheetPreviewRow[];
          fieldReviews?: Array<{ fieldKey: string; status: string; comment?: string }>;
        };
        error?: string;
      };

      if (!res.ok || !json.data) {
        setParseError(json.error || 'Could not load spreadsheet from Drive');
        setBill(null);
        setEmbedUrl(clientFileEmbedFallback(item, fileOnly));
        if (fileOnly) setOpenUrl(clientUrl || null);
        return;
      }

      setResolveNote(json.data.resolveNote || null);
      setOpenUrl(json.data.openInDriveUrl || clientUrl || null);
      const embed = json.data.filePreviewEmbedUrl || clientFileEmbedFallback(item, fileOnly);
      setEmbedUrl(embed);

      if (!fileOnly) {
        setIsElectricityBill(json.data.isElectricityBill);
        setBill(json.data.bill);
        setMonths(json.data.availableMonths || []);
        setStructuredRows(json.data.structuredRows || []);
        setSpreadsheetHeaders(json.data.spreadsheetHeaders || []);
        setSpreadsheetRows(json.data.spreadsheetRows || []);
        if (json.data.fieldReviews) setFieldReviews(json.data.fieldReviews);
      }

      if (!embed) {
        setParseError(
          json.data.resolveNote ||
            'Could not open the file in the viewer. Use a direct Google Drive file or Sheet link (not only a folder link).'
        );
      } else if (!fileOnly && !json.data.parsedFromExcel && !json.data.structuredRows?.length) {
        setParseError(
          'File is open below. Enable “Anyone with the link” or share with the service account to read spreadsheet cells in the UI.'
        );
      }
    } catch {
      setParseError('Failed to fetch document preview');
      setEmbedUrl(clientFileEmbedFallback(item, fileOnly));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(selectedMonth || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.requirementId, item.linkIndex]);

  const title = fileOnly
    ? resolveClientEvidenceLabel({ description: item.description, requirementTitle: item.requirementTitle })
    : item.fileName || item.requirementTitle;
  const driveUrl = fileOnly
    ? resolveClientEvidenceUrl({ sourceUrl: item.sourceUrl, url: item.url, vaultUrl: item.vaultUrl }) || openUrl
    : openUrl || item.vaultUrl || item.sourceUrl || item.url;

  const inner = (
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950 space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{title}</div>
            <p className="text-[10px] text-slate-500 truncate">
              {fileOnly
                ? 'Client-attached file · preview only'
                : `${item.clientGroupName ? `${item.clientGroupName} · ` : ''}Facility: ${item.facilityName || item.facilityId} · ${item.dataCategory || 'Submission'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!fileOnly && months.length > 1 && (
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                loadPreview(e.target.value);
              }}
              className="text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-1 text-slate-800 dark:text-slate-200"
            >
              <option value="">Latest row</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Open in Drive <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!modal && (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {resolveNote && (
        <p className="text-[10px] text-emerald-800 dark:text-emerald-300/90 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-slate-200 dark:border-slate-800">
          {resolveNote}
        </p>
      )}

      {loading && fileOnly && (
        <p className="px-4 py-6 text-xs text-slate-500 text-center animate-pulse">Loading client file…</p>
      )}

      {embedUrl ? (
        <div className={fileOnly ? '' : 'border-b border-slate-200 dark:border-slate-800'}>
          <iframe
            title="Client spreadsheet file preview"
            src={embedUrl}
            className={`w-full bg-white border-0 ${fileOnly ? 'min-h-[min(72vh,640px)] h-[72vh]' : 'min-h-[280px] h-[40vh]'}`}
            allow="fullscreen"
          />
        </div>
      ) : (
        !loading && (
          <div className="p-4 text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40">
            No file preview available. Use a direct file link to the .xlsx / Google Sheet, not only the parent folder.
          </div>
        )
      )}

      {!fileOnly && (
      <div className="p-4 max-h-[48vh] overflow-y-auto space-y-4">
        {isElectricityBill ? (
          <PspclBillPreviewCard
            bill={
              bill || {
                utilityName: '',
                billTitle: '',
                subDivision: '',
                circle: '',
                billInvoiceNumber: '',
                billingCycle: '',
                consumerAccount: '',
                consumerName: '',
                meterNumber: '',
                contractDemand: '',
                netImportKwh: '',
                netImportUnit: '',
                netImportStatus: '',
                mdiKva: '',
                mdiStatus: '',
                powerFactor: '',
                pfStatus: '',
                declaredEnergyKwh: '',
                billedEnergyKwh: '',
                varianceKwh: '',
                variancePercent: '',
                reconciliationSummary: '',
                reconciliationVariant: 'neutral',
                sourceMonth: '',
              }
            }
            loading={loading}
            parseError={parseError || undefined}
          />
        ) : (
          <IndustrialSubmissionPreviewCard
            requirementTitle={item.requirementTitle}
            dataCategory={item.dataCategory}
            facilityName={item.facilityName}
            facilityId={item.facilityId}
            clientGroupName={item.clientGroupName}
            period={item.period}
            requestId={item.requestId}
            submittedBy={item.submittedBy}
            mappingStatus={item.mappingStatus}
            workflowStatus={item.workflowStatus}
            structuredRows={structuredRows}
            fieldReviews={fieldReviews}
            spreadsheetHeaders={spreadsheetHeaders}
            spreadsheetRows={spreadsheetRows}
            parseError={parseError || undefined}
            loading={loading}
          />
        )}

        {driveUrl && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Original file</span>
              <span className="font-mono text-[10px] text-emerald-700 truncate block">{driveUrl}</span>
            </div>
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#17365D] dark:bg-[#A56F63] text-white text-[10px] font-bold"
            >
              Open in Drive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
      )}

      {modal && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-2 text-slate-500 text-[10px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{fileOnly ? 'Client-attached evidence file' : 'Client evidence · mapped from live submission'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[10px] font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close Document
          </button>
        </div>
      )}
    </div>
  );

  if (!modal) return inner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`relative w-full max-h-[92vh] overflow-hidden flex flex-col ${fileOnly ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-slate-800 text-slate-600 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="overflow-y-auto flex-1">{inner}</div>
      </div>
    </div>
  );
};