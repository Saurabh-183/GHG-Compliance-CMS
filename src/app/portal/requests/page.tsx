'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  FileSpreadsheet,
  Link2,
  Folder,
  UploadCloud,
  X,
  Zap,
  Receipt,
  ShieldCheck,
  Info,
  Eye,
  Calendar,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { EvidenceDocumentModal } from '@/components/common/EvidenceDocumentModal';
import { formatDate, formatNumber } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';

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

export default function ClientRequestsPage() {
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<IDataRequirement | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [reportingMonth, setReportingMonth] = useState('');
  const [connection, setConnection] = useState<ConnectionForm>(EMPTY_CONNECTION);
  const [bill, setBill] = useState<BillForm>(EMPTY_BILL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const setConnectionField = (key: keyof ConnectionForm, value: string) =>
    setConnection((current) => ({ ...current, [key]: value }));

  const setBillField = (key: keyof BillForm, value: string) =>
    setBill((current) => ({ ...current, [key]: value }));

  const isElectricityRequest = useMemo(
    () =>
      !!selectedReq &&
      /electricity|grid|discom|power bill/i.test(`${selectedReq.title} ${selectedReq.description}`),
    [selectedReq]
  );

  const loadRequests = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch('/api/requirements', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load compliance requests.');
      }
      setRequirements(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      console.error('Failed to load client requirements:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to load compliance requests.';
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const resetForm = () => {
    setSelectedReq(null);
    setDriveUrl('');
    setFileDescription('');
    setReportingMonth('');
    setConnection(EMPTY_CONNECTION);
    setBill(EMPTY_BILL);
    setIsPreviewOpen(false);
  };

  const openSubmissionForm = (requirement: IDataRequirement) => {
    setSelectedReq(requirement);
    setDriveUrl('');
    setFileDescription('');
    setReportingMonth('');
    setConnection({
      ...EMPTY_CONNECTION,
      ...(requirement.utilityConnection || {}),
    });
    setBill(EMPTY_BILL);
    setIsPreviewOpen(false);
  };

  const validateForm = (): boolean => {
    if (!selectedReq) {
      notify.error('Select a data requirement first.');
      return false;
    }

    if (selectedReq.monthlyFrequency && (!reportingMonth || !(selectedReq.reportingMonths || []).includes(reportingMonth))) {
      notify.warning('Select one of the reporting months requested by your consultant.');
      return false;
    }

    if (!isGoogleDriveUrl(driveUrl)) {
      notify.warning('Enter a valid HTTPS Google Drive or Google Docs URL.');
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !validateForm() || !selectedReq) return;

    setIsSubmitting(true);
    try {
      const requestBody = {
        url: driveUrl.trim(),
        description: fileDescription.trim() || 'Client submission via portal',
        ...(selectedReq.monthlyFrequency ? { reportingMonth } : {}),
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
      };

      const response = await fetch(`/api/requirements/${selectedReq._id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || `Submission failed (${response.status}).`);
      }

      notify.success(payload?.message || 'Evidence submitted successfully.');
      resetForm();
      await loadRequests();
    } catch (error) {
      console.error('Client evidence submission failed:', error);
      notify.error(error instanceof Error ? error.message : 'Network error submitting evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <CarbonCrunchLoader message="Loading compliance data requests..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Outstanding Compliance Data Requests
          </h1>
          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
            Submit required energy records, certificates and supporting Google Drive evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors"
        >
          Refresh requests
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {loadError}
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">Requirement Title</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Frameworks</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Submitted Documents</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {requirements.map((requirement) => (
                <tr
                  key={requirement._id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {requirement.title}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {requirement.description}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {requirement.period}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {(requirement.linkedCompliances || []).map((compliance) => (
                        <span
                          key={compliance}
                          className="rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                        >
                          {compliance}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {requirement.dueDate ? formatDate(requirement.dueDate) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={requirement.submissionStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-2">
                      {requirement.submittedDriveLinks?.length ? (
                        requirement.submittedDriveLinks.map((link, index) => (
                          <div key={`${link.url}-${index}`} className="space-y-1">
                            <DriveLinkBadge
                              url={link.vaultUrl || link.url}
                              label={link.description || 'Drive Document'}
                              billDetails={link.billDetails}
                              utilityConnectionSnapshot={link.utilityConnectionSnapshot}
                              facilityId={requirement.facilityId}
                            />
                            {'vaultFolderPath' in link && link.vaultFolderPath && (
                              <div className="flex items-center gap-1 line-clamp-1 font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                                <Folder className="h-3 w-3 shrink-0" />
                                {link.vaultFolderPath}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-400 dark:text-slate-500">
                          No document submitted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => openSubmissionForm(requirement)}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold !text-white shadow-sm transition-colors hover:bg-emerald-800"
                    >
                      + Submit Link
                    </button>
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No data requests are currently assigned to your facilities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Link Submission Modal */}
      {selectedReq && (
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
                      Submit Supporting Evidence & Records
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                      Audit Vault
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span>
                      Requirement: <strong className="font-semibold text-slate-800 dark:text-slate-200">{selectedReq.title}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Facility: <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{selectedReq.facilityId}</span>
                    </span>
                    <span>·</span>
                    <span>
                      Period: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedReq.period}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
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
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">

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
                        Google Drive / Google Docs URL <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          required
                          placeholder="https://drive.google.com/file/d/... or folders/..."
                          value={driveUrl}
                          onChange={(e) => setDriveUrl(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all font-mono font-medium shadow-2xs"
                        />
                      </div>
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>
                          Ensure link access is set to <strong>&quot;Anyone with the link can view&quot;</strong> or shared with your compliance auditor. It will be cataloged directly in the regulatory vault at <code className="text-blue-800 dark:text-blue-300 font-mono text-[10px] font-bold">Client_Submissions/{selectedReq.facilityId}/</code>.
                        </span>
                      </div>
                    </div>

                    {selectedReq.monthlyFrequency && (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Reporting month <span className="text-rose-500">*</span></label>
                        <select required value={reportingMonth} onChange={(event) => setReportingMonth(event.target.value)} className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                          <option value="">Select month</option>
                          {(selectedReq.reportingMonths || []).map((month) => <option key={month} value={month}>{month}</option>)}
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
                        onChange={(e) => setFileDescription(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

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
              </div>

              {/* Modal Sticky Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Encrypted & timestamped in compliance audit trail</span>
                  <span className="sm:hidden">Audited submission</span>
                </div>

                <div className="flex items-center gap-3">
                  {isElectricityRequest && (
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
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 !text-white shadow-md transition-all disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isSubmitting ? 'Uploading & Indexing...' : 'Submit Evidence Link'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Electricity Draft Preview Modal */}
      {selectedReq && isElectricityRequest && (
        <EvidenceDocumentModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          url={driveUrl}
          label={`Client-entered electricity bill · ${selectedReq.title}`}
          facilityId={selectedReq.facilityId}
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
    </div>
  );
}
