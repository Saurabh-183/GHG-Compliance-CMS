'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, Folder, Eye } from 'lucide-react';
import { EvidenceDocumentModal } from './EvidenceDocumentModal';

interface DriveLinkBadgeProps {
  url?: string;
  label?: string;
  isFolder?: boolean;
  className?: string;
  month?: string;
  billDetails?: { invoiceNumber: string; billingFrom: string; billingTo: string; consumptionKwh: number; billAmount: number };
  utilityConnectionSnapshot?: { providerName: string; connectionType: string; subDivision: string; circle: string; consumerAccountNumber: string; consumerName: string; meterNumber: string; contractDemand: string };
  facilityId?: string;
  /** When set, opens parent-provided preview instead of the legacy electricity bill modal */
  onOpenPreview?: () => void;
}

export const DriveLinkBadge: React.FC<DriveLinkBadgeProps> = ({
  url,
  label = 'View on Drive',
  isFolder = false,
  className = '',
  month,
  billDetails,
  utilityConnectionSnapshot,
  facilityId,
  onOpenPreview,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const useLegacyBillModal = !onOpenPreview;

  if (!url) {
    return (
      <span className="text-slate-500 text-xs italic">
        Not linked
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (onOpenPreview ? onOpenPreview() : setIsPreviewOpen(true))}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 dark:hover:bg-emerald-900/60 dark:hover:text-emerald-200 transition-colors shadow-2xs group text-left cursor-pointer ${className}`}
        title={`Preview evidence document: ${label}`}
      >
        {isFolder ? (
          <Folder className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
        )}
        <span className="truncate max-w-[140px]">{label}</span>
        <Eye className="w-3 h-3 text-emerald-700/70 group-hover:text-emerald-800 dark:text-emerald-400/70 dark:group-hover:text-emerald-300 transition-transform group-hover:scale-110" />
      </button>

      {useLegacyBillModal && (
        <EvidenceDocumentModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          url={url}
          label={label}
          month={month}
          billDetails={billDetails}
          utilityConnectionSnapshot={utilityConnectionSnapshot}
          facilityId={facilityId}
          useIndustrialPreview={!billDetails && !utilityConnectionSnapshot}
        />
      )}
    </>
  );
};

