'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Folder,
  UploadCloud,
  X,
  Zap,
  Receipt,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { EvidenceDocumentModal } from '@/components/common/EvidenceDocumentModal';
import { FileSpreadsheet, Folder, Eye, X, UploadCloud } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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
  const [connection, setConnection] = useState<ConnectionForm>(EMPTY_CONNECTION);
  const [bill, setBill] = useState<BillForm>(EMPTY_BILL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const isElectricityRequest = useMemo(
    () => !!selectedReq && /electricity|grid|discom|power bill/i.test(`${selectedReq.title} ${selectedReq.description}`),
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
      const message = error instanceof Error ? error.message : 'Failed to load compliance requests.';
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
    setConnection(EMPTY_CONNECTION);
    setBill(EMPTY_BILL);
    setIsPreviewOpen(false);
  };

  const openSubmissionForm = (requirement: IDataRequirement) => {
    setSelectedReq(requirement);
    setDriveUrl('');
    setFileDescription('');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Outstanding Compliance Data Requests
          </h1>
          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
            Submit required energy records, certificates and supporting Google Drive evidence.
          </p>
        </div>
        <button type="button" onClick={() => void loadRequests()} className="px-3 py-2 text-xs rounded-md border border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          Refresh requests
        </button>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {loadError}
        </div>
      )}

      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 sm:p-6 space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Requirement Title</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Frameworks</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Submitted Documents</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/70 text-xs">
              {requirements.map((requirement) => (
                <tr key={requirement._id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{requirement.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{requirement.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-300">{requirement.period}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {(requirement.linkedCompliances || []).map((compliance) => (
                        <span key={compliance} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">{compliance}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-300">{requirement.dueDate ? formatDate(requirement.dueDate) : '—'}</td>
                  <td className="py-3.5 px-4 text-center"><StatusBadge status={requirement.submissionStatus} size="sm" /></td>
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
                              facilityId={req.facilityId}
                              facilityId={requirement.facilityId}
                            />
                            {'vaultFolderPath' in link && link.vaultFolderPath && (
                              <div className="flex items-center gap-1 line-clamp-1 font-mono text-[9px] text-emerald-500">
                                <Folder className="h-3 w-3 shrink-0" />
                                {link.vaultFolderPath}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-500">No document submitted</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button type="button" onClick={() => openSubmissionForm(requirement)} className="w-28 rounded-md bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800">
                      + Submit Link
                    </button>
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No data requests are currently assigned to your facilities.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Link Submission Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Fixed Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Submit Supporting Evidence
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                      Google Drive Vault
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Requirement: <strong className="font-semibold text-slate-800 dark:text-slate-200">{selectedReq.title}</strong> · Facility: <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{selectedReq.facilityId}</span>
                  </p>
                </div>
      {selectedReq && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" role="presentation">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="submission-dialog-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="submission-dialog-title" className="text-sm font-bold text-white">Submit Google Drive Evidence</h2>
                <p className="mt-1 text-xs text-slate-400">Requirement: <strong className="text-white">{selectedReq.title}</strong></p>
                <p className="mt-1 text-[10px] text-slate-500">Facility: {selectedReq.facilityId} · Period: {selectedReq.period}</p>
              </div>
              <button type="button" onClick={resetForm} aria-label="Close submission form" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitDriveLink} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                {/* Google Drive Link Section */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Google Drive Evidence Link</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Google Drive URL (File or Folder) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://drive.google.com/file/d/... or folders/..."
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs font-mono"
                    />
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                      <span>
                        Ensure the file is shared with your Carbon Crunch auditor account or set to &quot;Anyone with the link can view&quot;. It will be archived under <code className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">Client_Submissions/{selectedReq.facilityId}/</code>.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Description / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q1 Monthly Grid Consumption Excel & Official DISCOM Bills (Apr-Jun 2025)"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Section 2: Facility Electricity Connection (if electricity request) */}
                {isElectricityRequest && (
                  <>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Facility Electricity Connection Profile
                          </h4>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Reused across cycles
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                        DISCOM connection attributes linked to this facility for automatic compliance matrix reconciliation.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Electricity Provider / DISCOM <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. PSPCL, Tata Power, BESCOM"
                            value={connection.providerName}
                            onChange={(e) => setConnectionField('providerName', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Connection Type <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. High Tension (HT) Industrial"
                            value={connection.connectionType}
                            onChange={(e) => setConnectionField('connectionType', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Sub-Division <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Barnala Industrial Area"
                            value={connection.subDivision}
                            onChange={(e) => setConnectionField('subDivision', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Circle <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Sangrur Circle"
                            value={connection.circle}
                            onChange={(e) => setConnectionField('circle', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Consumer Account Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. PSPCL-BNL-66KV-0042"
                            value={connection.consumerAccountNumber}
                            onChange={(e) => setConnectionField('consumerAccountNumber', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Consumer Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Trident Paper Limited"
                            value={connection.consumerName}
                            onChange={(e) => setConnectionField('consumerName', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Meter Serial Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. L&T-EM-99214"
                            value={connection.meterNumber}
                            onChange={(e) => setConnectionField('meterNumber', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Contract Demand <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. 12,000 kVA (66 kV)"
                            value={connection.contractDemand}
                            onChange={(e) => setConnectionField('contractDemand', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Electricity Bill Details */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Electricity Bill & Consumption Particulars
                          </h4>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60">
                          This bill cycle
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                        Specific invoice values for energy reconciliation against declared plant logs.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Bill / Invoice Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. PSPCL/BNL/2025/06/9821"
                            value={bill.invoiceNumber}
                            onChange={(e) => setBillField('invoiceNumber', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Billing Period (From) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={bill.billingFrom}
                            onChange={(e) => setBillField('billingFrom', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Billing Period (To) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={bill.billingTo}
                            onChange={(e) => setBillField('billingTo', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                              className="w-full pl-3 pr-12 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 pointer-events-none">
                              kWh
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                              className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Encrypted & securely logged into audit trail</span>
                  <span className="sm:hidden">Audited submission</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedReq(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 !text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isSubmitting ? 'Uploading & Indexing...' : 'Submit Evidence Link'}</span>
                  </button>
                </div>
            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="drive-url" className="mb-1 block text-xs font-semibold text-slate-300">Google Drive / Google Docs URL</label>
                <input id="drive-url" type="url" value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://drive.google.com/file/d/..." className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-600" />
                <p className="mt-1 text-[10px] text-slate-500">The link must be accessible to the consultant. Previewing the entered data does not upload or save anything.</p>
              </div>

              <div>
                <label htmlFor="file-description" className="mb-1 block text-xs font-semibold text-slate-300">Document description / file name</label>
                <input id="file-description" type="text" value={fileDescription} onChange={(event) => setFileDescription(event.target.value)} placeholder="e.g. April 2025 electricity bill" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-600" />
              </div>

              {isElectricityRequest && (
                <>
                  <section className="space-y-3 border-t border-slate-800 pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-white">Facility electricity connection</h3>
                      <p className="text-[10px] text-slate-500">These connection details are saved on the facility and copied into this submission as a historical snapshot.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {([
                        ['providerName', 'Electricity provider'],
                        ['connectionType', 'Connection type'],
                        ['subDivision', 'Sub-division'],
                        ['circle', 'Circle'],
                        ['consumerAccountNumber', 'Consumer account number'],
                        ['consumerName', 'Consumer name'],
                        ['meterNumber', 'Meter number'],
                        ['contractDemand', 'Contract demand'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="block text-xs text-slate-300">
                          {label}
                          <input required value={connection[key]} onChange={(event) => setConnection((current) => ({ ...current, [key]: event.target.value }))} placeholder={label} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-600" />
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3 border-t border-slate-800 pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-white">This electricity bill</h3>
                      <p className="text-[10px] text-slate-500">These values are stored separately for each bill submission.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {([
                        ['invoiceNumber', 'Invoice number', 'text'],
                        ['billingFrom', 'Billing period from', 'date'],
                        ['billingTo', 'Billing period to', 'date'],
                        ['consumptionKwh', 'Consumption (kWh)', 'number'],
                        ['billAmount', 'Bill amount (₹)', 'number'],
                      ] as const).map(([key, label, type]) => (
                        <label key={key} className="block text-xs text-slate-300">
                          {label}
                          <input required type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} value={bill[key]} onChange={(event) => setBill((current) => ({ ...current, [key]: event.target.value }))} placeholder={type === 'number' ? '0' : label} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-600" />
                        </label>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
                {isElectricityRequest && (
                  <button type="button" onClick={() => setIsPreviewOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50">
                    <Eye className="h-3.5 w-3.5" /> Preview entered data
                  </button>
                )}
                <button type="button" onClick={resetForm} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <UploadCloud className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
