'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
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
