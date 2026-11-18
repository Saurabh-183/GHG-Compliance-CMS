'use client';

import React, { useEffect, useState } from 'react';
import type { ClientUploadListItem } from '@/app/api/client-uploads/route';
import type { IPspclBillPreview } from '@/lib/pspclBillPreview';
import { getDrivePreviewEmbedUrl, parseGoogleDriveUrl } from '@/lib/driveVaultShared';
import { PspclBillPreviewCard } from './PspclBillPreviewCard';

interface ClientDocumentPreviewPanelProps {
  item: ClientUploadListItem;
  onClose: () => void;
}

function clientFileEmbedFallback(item: ClientUploadListItem): string | null {
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
}) => {
  const [bill, setBill] = useState<IPspclBillPreview | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(item.mappedMonth || '');
  const [loading, setLoading] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  const loadPreview = async (preferredMonth?: string) => {
    setLoading(true);
    setParseError(null);
    try {
      const res = await fetch('/api/documents/pspcl-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentUrl: item.sourceUrl || item.url,
          vaultUrl: item.vaultUrl,
          vaultFileId: item.vaultFileId,
          driveFolderId: item.driveFolderId,
          preferredMonth: preferredMonth || undefined,
          facilityId: item.facilityId,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          bill: IPspclBillPreview;
          availableMonths: string[];
          filePreviewEmbedUrl: string | null;
          openInDriveUrl: string | null;
          resolveNote?: string;
          parsedFromExcel: boolean;
          resolvedFileName?: string;
        };
        error?: string;
      };

      if (!res.ok || !json.data) {
        setParseError(json.error || 'Could not load spreadsheet from Drive');
        setBill(null);
        setEmbedUrl(clientFileEmbedFallback(item));
        return;
      }

      setBill(json.data.bill);
      setMonths(json.data.availableMonths || []);
      setResolveNote(json.data.resolveNote || null);
      setOpenUrl(json.data.openInDriveUrl);

      const embed = json.data.filePreviewEmbedUrl || clientFileEmbedFallback(item);
      setEmbedUrl(embed);

      if (!embed) {
        setParseError(
          json.data.resolveNote ||
            'Could not open the file in the viewer. Use a direct Google Drive file or Sheet link (not only a folder link).'
        );
      } else if (!json.data.parsedFromExcel) {
        setParseError(
          'File is open below. Could not read spreadsheet cells — enable “Anyone with the link” or share with the service account.'
        );
      }
    } catch {
      setParseError('Failed to fetch document preview');
      setEmbedUrl(clientFileEmbedFallback(item));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(selectedMonth || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.requirementId, item.linkIndex]);

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-950 space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/90">
        <div className="text-xs text-white font-semibold truncate">
          View in UI — {item.fileName || item.requirementTitle}
        </div>
        <div className="flex items-center gap-2">
          {months.length > 1 && (
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                loadPreview(e.target.value);
              }}
              className="text-[10px] rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-200"
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
              className="text-[10px] text-emerald-400 hover:underline"
            >
              Open file
            </a>
          )}
          <button type="button" onClick={onClose} className="text-[10px] text-slate-400 hover:text-white">
            Close
          </button>
        </div>
      </div>

      {resolveNote && (
        <p className="text-[10px] text-emerald-300/90 px-4 py-1.5 bg-emerald-950/30 border-b border-slate-800">
          {resolveNote}
        </p>
      )}

      {embedUrl ? (
        <div className="border-b border-slate-800">
          <iframe
            title="Client spreadsheet file preview"
            src={embedUrl}
            className="w-full min-h-[340px] h-[42vh] bg-white border-0"
            allow="fullscreen"
          />
        </div>
      ) : (
        !loading && (
          <div className="p-4 text-xs text-amber-200 bg-amber-950/20 border-b border-amber-900/40">
            No file preview available. Ask the client for a direct link to the Excel/Google Sheet file, not just the
            parent folder.
          </div>
        )
      )}

      <div className="p-4 max-h-[50vh] overflow-y-auto">
        <PspclBillPreviewCard
          bill={
            bill || {
              utilityName: 'Punjab State Power Corporation Limited (PSPCL)',
              billTitle: 'High Tension (HT) Industrial Electricity Bill',
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
      </div>
    </div>
  );
};