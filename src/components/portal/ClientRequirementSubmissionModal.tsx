'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IDataRequirement } from '@/types';
import {
  Link2,
  UploadCloud,
  X,
  Zap,
  Receipt,
  ShieldCheck,
  Info,
  Eye,
  Sparkles,
} from 'lucide-react';
import { EvidenceDocumentModal } from '@/components/common/EvidenceDocumentModal';
import { formatNumber } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { ClientDynamicFieldInput } from '@/components/requests/ClientDynamicFieldInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/utils';
import {
  hydrateClientSubmissionForm,
  isClientSubmissionReadOnly,
  getLatestDriveLink,
} from '@/lib/clientPortalSubmission';
import { clientSubmissionDueBlockedMessage, isDataRequestPastDue } from '@/lib/dataRequestDueDate';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';

type ConnectionForm = {
  providerName: string;
  connectionType: string;
  subDivision: string;
  circle: string;
  consumerAccountNumber: string;
  consumerName: string;
  meterNumber: string;
  contractDemand: string;
};

type BillForm = {
  invoiceNumber: string;
  billingFrom: string;
  billingTo: string;
  consumptionKwh: string;
  billAmount: string;
};

const EMPTY_CONNECTION: ConnectionForm = {
  providerName: '',
  connectionType: '',
  subDivision: '',
  circle: '',
  consumerAccountNumber: '',
  consumerName: '',
  meterNumber: '',
  contractDemand: '',
};

const EMPTY_BILL: BillForm = {
  invoiceNumber: '',
  billingFrom: '',
  billingTo: '',
  consumptionKwh: '',
  billAmount: '',
};

const isGoogleDriveUrl = (value: string) =>
  /^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(value.trim());

export type ClientRequirementSubmissionModalProps = {
  requirement: IDataRequirement | null;
  onClose: () => void;
  onSubmitted?: () => void | Promise<void>;
  /** Portal scope selectors — shown in header when requirement metadata differs */
  scopeFacilityId?: string;
  scopeFacilityName?: string;
  scopePeriod?: string;
};

export function ClientRequirementSubmissionModal({
  requirement,
  onClose,
  onSubmitted,
  scopeFacilityId,
  scopeFacilityName,
  scopePeriod,
}: ClientRequirementSubmissionModalProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [reportingMonth, setReportingMonth] = useState('');
  const [connection, setConnection] = useState<ConnectionForm>(EMPTY_CONNECTION);
  const [bill, setBill] = useState<BillForm>(EMPTY_BILL);
  const [structuredData, setStructuredData] = useState<Record<string, unknown>>({});
  const [clientComment, setClientComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeRequirement, setActiveRequirement] = useState<IDataRequirement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const setConnectionField = (key: keyof ConnectionForm, value: string) =>
    setConnection((current) => ({ ...current, [key]: value }));

  const setBillField = (key: keyof BillForm, value: string) =>
    setBill((current) => ({ ...current, [key]: value }));

  const isElectricityRequest = useMemo(
    () =>
      !!requirement &&
      /electricity|grid|discom|power bill/i.test(`${requirement.title} ${requirement.description}`),
    [requirement]
  );

  useEffect(() => {
    if (!requirement) {
      setActiveRequirement(null);
      setReadOnly(false);
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setIsPreviewOpen(false);
      try {
        const res = await fetch(`/api/requirements/${requirement._id}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json().catch(() => null);
        const full = (res.ok && json?.data ? json.data : requirement) as IDataRequirement;
        if (cancelled) return;

        setActiveRequirement(full);
        setReadOnly(isClientSubmissionReadOnly(full));
        const hydrated = hydrateClientSubmissionForm(full);
        setDriveUrl(hydrated.driveUrl);
        setFileDescription(hydrated.fileDescription);
        setReportingMonth(hydrated.reportingMonth);
        setConnection(hydrated.connection);
        setBill(hydrated.bill);
        setStructuredData(hydrated.structuredData);
        setClientComment(hydrated.clientComment);
      } catch {
        if (cancelled) return;
        setActiveRequirement(requirement);
        setReadOnly(isClientSubmissionReadOnly(requirement));
        const hydrated = hydrateClientSubmissionForm(requirement);
        setDriveUrl(hydrated.driveUrl);
        setFileDescription(hydrated.fileDescription);
        setReportingMonth(hydrated.reportingMonth);
        setConnection(hydrated.connection);
        setBill(hydrated.bill);
        setStructuredData(hydrated.structuredData);
        setClientComment(hydrated.clientComment);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [requirement]);

  const validateForm = (): boolean => {
    if (!requirement) {
      notify.error('Select a data requirement first.');
      return false;
    }

    if (
      scopeFacilityId &&
      requirement.facilityId.toUpperCase() !== scopeFacilityId.toUpperCase()
    ) {
      notify.warning(
        'This request is not for the currently selected facility. Change facility in the filter bar or pick another request.'
      );
      return false;
    }

    if (scopePeriod && requirement.period !== scopePeriod) {
      notify.warning(
        'This request is not for the selected financial year. Change the year filter or pick another request.'
      );
      return false;
    }

    const dueBlocked = clientSubmissionDueBlockedMessage(requirement.dueDate);
    if (dueBlocked) {
      notify.error(dueBlocked);
      return false;
    }

    if (
      requirement.monthlyFrequency &&
      (!reportingMonth || !(requirement.reportingMonths || []).includes(reportingMonth))
    ) {
      notify.warning('Select one of the reporting months requested by your consultant.');
      return false;
    }

    if (uploadFile) {
      if (uploadFile.size > 25 * 1024 * 1024) {
        notify.warning('File must be 25 MB or smaller.');
        return false;
      }
      if (isElectricityRequest) {
        notify.warning('Electricity bill requests require a Google Drive link with connection details. Use the link option below.');
        return false;
      }
    } else if (!isGoogleDriveUrl(driveUrl)) {
      notify.warning('Enter a valid Google Drive link, or choose a file to upload into the compliance vault.');
      return false;
    }

    const missingConfiguredField = (requirement.requiredFields || []).find((field) => field.required && (structuredData[field.key] === undefined || structuredData[field.key] === ''));
    if (missingConfiguredField) {
      notify.warning(`Complete the required field: ${missingConfiguredField.label}`);
      return false;
    }

    if (!isElectricityRequest) return true;

    const missingConnection = Object.values(connection).some((value) => !value.trim());
    const missingBill =
      !bill.invoiceNumber.trim() ||
      !bill.billingFrom ||
      !bill.billingTo ||
      bill.consumptionKwh.trim() === '' ||
      bill.billAmount.trim() === '';

    if (missingConnection || missingBill) {
      notify.warning('Complete all electricity connection and bill fields before submitting.');
      return false;
    }

    if (new Date(bill.billingFrom).getTime() > new Date(bill.billingTo).getTime()) {
      notify.warning('Billing start date cannot be after the billing end date.');
      return false;
    }

    const consumption = Number(bill.consumptionKwh);
    const amount = Number(bill.billAmount);
    if (!Number.isFinite(consumption) || consumption < 0 || !Number.isFinite(amount) || amount < 0) {
      notify.warning('Consumption and bill amount must be valid non-negative numbers.');
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    if (!requirement) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/requirements/${requirement._id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: true, structuredData, comment: clientComment.trim() || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Draft save failed');
      notify.success('Draft saved. You can submit when ready.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Draft save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !validateForm() || !requirement) return;

    setIsSubmitting(true);
    try {
      let response: Response;
      let payload: { message?: string; error?: string } | null;

      if (uploadFile && !isElectricityRequest) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('description', fileDescription.trim() || 'Client file upload via portal');
        if (requirement.monthlyFrequency && reportingMonth) {
          formData.append('reportingMonth', reportingMonth);
        }
        response = await fetch(`/api/requirements/${requirement._id}/submissions/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        payload = await response.json().catch(() => null);
      } else {
        const requestBody = {
          url: driveUrl.trim(),
          description: fileDescription.trim() || 'Client submission via portal',
          ...(requirement.monthlyFrequency ? { reportingMonth } : {}),
          ...(isElectricityRequest
            ? {
                utilityConnection: connection,
                billDetails: {
                  invoiceNumber: bill.invoiceNumber.trim(),
                  billingFrom: bill.billingFrom,
                  billingTo: bill.billingTo,
                  consumptionKwh: Number(bill.consumptionKwh),
                  billAmount: Number(bill.billAmount),
                },
              }
            : {}),
          structuredData,
          comment: clientComment.trim() || undefined,
        };

        response = await fetch(`/api/requirements/${requirement._id}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        payload = await response.json().catch(() => null);
      }

      if (!response.ok) {
        throw new Error(payload?.error || `Submission failed (${response.status}).`);
      }

      notify.success(payload?.message || 'Evidence submitted successfully.');
      onClose();
      if (onSubmitted) await onSubmitted();
    } catch (error) {
      console.error('Client evidence submission failed:', error);
      notify.error(error instanceof Error ? error.message : 'Network error submitting evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!requirement) return null;

  const displayReq = activeRequirement || requirement;
  const latestLink = getLatestDriveLink(displayReq);
  const inputDisabled = readOnly || detailLoading;
  const headerFacilityId = (scopeFacilityId || displayReq.facilityId || '').toUpperCase();
  const headerPeriod = scopePeriod || displayReq.period;
  const headerFacilityLabel =
    scopeFacilityName || displayReq.facilityName || headerFacilityId || displayReq.facilityId;
  const vaultFacilityId = displayReq.facilityId || headerFacilityId;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {readOnly ? 'Your submitted data' : 'Submit Supporting Evidence & Records'}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                      Audit Vault
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span>
                      Requirement: <strong className="font-semibold text-slate-800 dark:text-slate-200">{displayReq.title}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Facility:{' '}
                      <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                        {headerFacilityLabel}
                      </span>
                      {headerFacilityId && headerFacilityId !== headerFacilityLabel ? (
                        <span className="font-mono text-[10px] text-slate-500 ml-1">({headerFacilityId})</span>
                      ) : null}
                    </span>
                    <span>·</span>
                    <span>
                      Period: <span className="font-mono text-slate-700 dark:text-slate-300">{headerPeriod}</span>
                    </span>
                    {readOnly && (
                      <>
                        <span>·</span>
                        <StatusBadge status={displayReq.workflowStatus || 'SUBMITTED'} type="verification" size="sm" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper / Section Progress Overview Bar */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-4 overflow-x-auto text-[11px] shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Sections:
              </span>
              <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <span>Drive Evidence Link</span>
              </div>
              {isElectricityRequest && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">→</span>
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold shadow-2xs">
                    <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    <span>DISCOM Connection Profile</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">→</span>
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold shadow-2xs">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    <span>Bill & Metering Details</span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Form */}
            <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                {detailLoading && (
                  <p className="text-center text-slate-500 animate-pulse py-2">Loading your submission…</p>
                )}

                {displayReq.dueDate && isDataRequestPastDue(displayReq.dueDate) && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-4 text-[11px] text-rose-900 dark:text-rose-200">
                    {clientSubmissionDueBlockedMessage(displayReq.dueDate)}
                  </div>
                )}

                {readOnly && latestLink && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30 p-4 space-y-2">
                    <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      Submission on file
                      {latestLink.submittedAt ? ` · ${formatDate(latestLink.submittedAt)}` : ''}
                      {latestLink.submittedBy ? ` · ${latestLink.submittedBy}` : ''}
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Below is what you submitted. Your consultant uses this for verification.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(displayReq.submittedDriveLinks || []).map((link, i) => (
                        <DriveLinkBadge
                          key={`${link.url}-${i}`}
                          url={link.vaultUrl || link.sourceUrl || link.url}
                          label={link.fileName || link.description || `File ${i + 1}`}
                          facilityId={displayReq.facilityName || displayReq.facilityId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <fieldset disabled={inputDisabled} className="space-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-100">
                {/* ---------------- SECTION 1: GOOGLE DRIVE EVIDENCE ---------------- */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  {/* Section 1 Header */}
                  <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Google Drive Evidence Link & Documentation</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Specify the verified Google Drive link containing official meter sheets, spreadsheets, or scanned utility invoices.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                      Required · Audit Link
                    </span>
                  </div>

                  {/* Section 1 Body */}
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Google Drive / Google Docs URL{' '}
                        {!uploadFile && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          required={!uploadFile}
                          placeholder="https://drive.google.com/file/d/... or folders/..."
                          value={driveUrl}
                          readOnly={readOnly}
                          disabled={inputDisabled || Boolean(uploadFile)}
                          onChange={(e) => setDriveUrl(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all font-mono font-medium shadow-2xs"
                        />
                      </div>
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p>
                            Paste a shared link, or upload a file below. Submissions are copied into the Carbon Crunch
                            vault:{' '}
                            <a
                              href={GOOGLE_DRIVE_FOLDER_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-semibold"
                            >
                              Open vault folder
                            </a>{' '}
                            (path{' '}
                            <code className="font-mono text-[10px]">Client_Submissions/…/{vaultFacilityId}/…</code>).
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            Without Google Drive API credentials in .env, uploads stay in a local dev vault. For auto-copy into
                            your vault folder, add GDRIVE_SERVICE_ACCOUNT_* or GDRIVE_OAUTH_* (see .env.example) or paste
                            a shared Drive link.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/50 p-4 space-y-2">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Or upload file directly to vault (max 25 MB)
                      </label>
                      <input
                        type="file"
                        disabled={inputDisabled || readOnly || isElectricityRequest}
                        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setUploadFile(f);
                          if (f) setDriveUrl('');
                        }}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-semibold"
                      />
                      {uploadFile && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          Selected: {uploadFile.name} — will be saved in the vault folder on submit.
                        </p>
                      )}
                      {isElectricityRequest && (
                        <p className="text-[10px] text-slate-500">Electricity requests need a Drive link plus bill fields.</p>
                      )}
                    </div>

                    {displayReq.monthlyFrequency && (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Reporting month <span className="text-rose-500">*</span></label>
                        <select required={!readOnly} disabled={inputDisabled} value={reportingMonth} onChange={(event) => setReportingMonth(event.target.value)} className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                          <option value="">Select month</option>
                          {(displayReq.reportingMonths || []).map((month) => <option key={month} value={month}>{month}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Document Description / File Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Q1 Monthly Grid Consumption Excel & Official DISCOM Invoices (Apr-Jun 2025)"
                        value={fileDescription}
                        readOnly={readOnly}
                        disabled={inputDisabled}
                        onChange={(e) => setFileDescription(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {(displayReq.requiredFields || []).length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Information requested by consultant</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Complete the fields below. Fields marked required must be filled before submission.</p>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(displayReq.requiredFields || []).map((field) => {
                        const review = displayReq.fieldReviews?.find((item) => item.fieldKey === field.key);
                        const needsFix = review && ['MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'].includes(review.status);
                        return (
                          <ClientDynamicFieldInput
                            key={field.key}
                            field={field}
                            value={structuredData[field.key]}
                            onChange={(next) => setStructuredData((current) => ({ ...current, [field.key]: next }))}
                            readOnly={readOnly}
                            highlightError={needsFix}
                            errorHint={
                              needsFix
                                ? `Consultant: ${review?.status?.replaceAll('_', ' ')}${review?.comment ? ` — ${review.comment}` : ''}`
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ---------------- SECTION 2: FACILITY CONNECTION PROFILE ---------------- */}
                {isElectricityRequest && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                    {/* Section 2 Header */}
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          2
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Facility Electricity Connection Profile</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            DISCOM grid connection snapshot. These values are saved on the facility profile and automatically reused across future cycles.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                        Facility Profile · Reused
                      </span>
                    </div>

                    {/* Section 2 Body */}
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Electricity Provider / DISCOM <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. PSPCL, Tata Power, BESCOM"
                            value={connection.providerName}
                            onChange={(e) => setConnectionField('providerName', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Connection Type <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. High Tension (HT) Industrial"
                            value={connection.connectionType}
                            onChange={(e) => setConnectionField('connectionType', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Sub-Division <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Barnala Industrial Area"
                            value={connection.subDivision}
                            onChange={(e) => setConnectionField('subDivision', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Circle / Operational Zone <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Sangrur Circle"
                            value={connection.circle}
                            onChange={(e) => setConnectionField('circle', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Consumer Account Number (CA No.) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. PSPCL-BNL-66KV-0042"
                            value={connection.consumerAccountNumber}
                            onChange={(e) =>
                              setConnectionField('consumerAccountNumber', e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Registered Consumer Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Trident Paper Limited"
                            value={connection.consumerName}
                            onChange={(e) => setConnectionField('consumerName', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Meter Serial Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. L&T-EM-99214"
                            value={connection.meterNumber}
                            onChange={(e) => setConnectionField('meterNumber', e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Sanctioned / Contract Demand <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. 12,000 kVA (66 kV)"
                            value={connection.contractDemand}
                            onChange={(e) => setConnectionField('contractDemand', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- SECTION 3: ELECTRICITY BILL DETAILS ---------------- */}
                {isElectricityRequest && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                    {/* Section 3 Header */}
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          3
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Electricity Bill & Active Energy Metering</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Specific invoice entries for GHG Scope 2 and BEE PAT compliance reconciliation. Stored for this reporting cycle.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shrink-0">
                        This Filing Cycle
                      </span>
                    </div>

                    {/* Section 3 Body */}
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          Bill / Invoice Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. PSPCL/BNL/2025/06/9821"
                          value={bill.invoiceNumber}
                          onChange={(e) => setBillField('invoiceNumber', e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Billing Period (From Date) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={bill.billingFrom}
                            onChange={(e) => setBillField('billingFrom', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Billing Period (To Date) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={bill.billingTo}
                            onChange={(e) => setBillField('billingTo', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Billed Active Energy Consumption (kWh) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              required
                              type="number"
                              min="0"
                              step="any"
                              placeholder="e.g. 1265000"
                              value={bill.consumptionKwh}
                              onChange={(e) => setBillField('consumptionKwh', e.target.value)}
                              className="w-full pl-3 pr-14 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 pointer-events-none">
                              kWh
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                            Total Bill Amount (₹) <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-slate-400 pointer-events-none">
                              ₹
                            </span>
                            <input
                              required
                              type="number"
                              min="0"
                              step="any"
                              placeholder="e.g. 8855000"
                              value={bill.billAmount}
                              onChange={(e) => setBillField('billAmount', e.target.value)}
                              className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Calculation / Validation Strip */}
                      {(bill.consumptionKwh || bill.billAmount) && (
                        <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-semibold">
                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Live Reconciled Metric:</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            {bill.consumptionKwh && (
                              <span className="text-slate-800 dark:text-slate-200">
                                Active Energy: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatNumber(bill.consumptionKwh)} kWh</strong>
                              </span>
                            )}
                            {bill.billAmount && (
                              <span className="text-slate-800 dark:text-slate-200">
                                Total: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">₹{formatNumber(bill.billAmount)}</strong>
                              </span>
                            )}
                            {bill.consumptionKwh && bill.billAmount && Number(bill.consumptionKwh) > 0 && (
                              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                                Rate: ~₹{(Number(bill.billAmount) / Number(bill.consumptionKwh)).toFixed(2)}/kWh
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Additional comments (optional)</label>
                  <textarea value={clientComment} readOnly={readOnly} disabled={inputDisabled} onChange={(event) => setClientComment(event.target.value)} rows={3} placeholder="Add context for the consultant, such as a document limitation or correction note." className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white" />
                </div>
                </fieldset>
              </div>

              {/* Modal Sticky Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Encrypted & timestamped in compliance audit trail</span>
                  <span className="sm:hidden">Audited submission</span>
                </div>

                <div className="flex items-center gap-3">
                  {isElectricityRequest && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Slip</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  >
                    {readOnly ? 'Close' : 'Cancel'}
                  </button>

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void saveDraft()}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                      >
                        Save draft
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting || detailLoading}
                        className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 !text-white shadow-md transition-all disabled:opacity-50"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isSubmitting ? 'Uploading & Indexing...' : 'Submit Evidence Link'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

      {isElectricityRequest && (
        <EvidenceDocumentModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          url={driveUrl}
          label={`Client-entered electricity bill · ${displayReq.title}`}
          facilityId={displayReq.facilityName || displayReq.facilityId}
          utilityConnectionSnapshot={connection}
          billDetails={{
            invoiceNumber: bill.invoiceNumber,
            billingFrom: bill.billingFrom,
            billingTo: bill.billingTo,
            consumptionKwh: bill.consumptionKwh === '' ? null : Number(bill.consumptionKwh),
            billAmount: bill.billAmount === '' ? null : Number(bill.billAmount),
          }}
          isDraftPreview
        />
      )}
    </>
  );
}
