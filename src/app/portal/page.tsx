'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';
import { EvidenceDocumentModal } from '@/components/common/EvidenceDocumentModal';

export default function ClientRequestsPage() {
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<IDataRequirement | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [connection, setConnection] = useState({ providerName: '', connectionType: '', subDivision: '', circle: '', consumerAccountNumber: '', consumerName: '', meterNumber: '', contractDemand: '' });
  const [bill, setBill] = useState({ invoiceNumber: '', billingFrom: '', billingTo: '', consumptionKwh: '', billAmount: '' });
  const setConnectionField = (key: keyof typeof connection, value: string) => setConnection((current) => ({ ...current, [key]: value }));
  const setBillField = (key: keyof typeof bill, value: string) => setBill((current) => ({ ...current, [key]: value }));
  const isElectricityRequest = !!selectedReq && /electricity|grid|discom|power bill/i.test(`${selectedReq.title} ${selectedReq.description}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requirements');
      if (res.ok) {
        const json = (await res.json()) as { data: IDataRequirement[] };
        setRequirements(json.data || []);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load compliance requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmitDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const normalizedUrl = driveUrl.trim();
    if (!/^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(normalizedUrl)) {
      notify.warning('Enter a valid Google Drive URL before submitting.');
      return;
    }

    if (isElectricityRequest) {
      const missingConnection = Object.entries(connection).some(([, value]) => !value.trim());
      const missingBill = !bill.invoiceNumber.trim() || !bill.billingFrom || !bill.billingTo || bill.consumptionKwh === '' || bill.billAmount === '';
      if (missingConnection || missingBill) {
        notify.warning('Complete all electricity connection and bill fields before submitting.');
        return;
      }
      if (new Date(bill.billingFrom) > new Date(bill.billingTo)) {
        notify.warning('Billing start date cannot be after the billing end date.');
        return;
      }
      if (Number(bill.consumptionKwh) < 0 || Number(bill.billAmount) < 0 || !Number.isFinite(Number(bill.consumptionKwh)) || !Number.isFinite(Number(bill.billAmount))) {
        notify.warning('Consumption and bill amount must be valid non-negative numbers.');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/requirements/${selectedReq._id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          description: fileDescription || 'Client submission via portal',
          ...(isElectricityRequest ? { utilityConnection: connection, billDetails: { ...bill, consumptionKwh: Number(bill.consumptionKwh), billAmount: Number(bill.billAmount) } } : {}),
        }),
      });

      if (res.ok) {
        notify.success('Google Drive evidence link submitted successfully! Status updated to RECEIVED.');
        setDriveUrl('');
        setFileDescription('');
        setSelectedReq(null);
        setIsFormPreviewOpen(false);
        await loadRequests();
      } else {
        const error = await res.json().catch(() => null);
        notify.error(error?.error || 'Failed to submit Google Drive link');
      }
    } catch (err) {
      notify.error('Network error submitting document link');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading compliance data requests..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Outstanding Compliance Data Requests
          </h1>
          <p className="text-xs   mt-1">
            Submit required energy logs, production certificates, and DISCOM invoices by pasting verified Google Drive URLs.
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold   uppercase tracking-wider">
                <th className="py-3 px-4">Requirement Title</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Frameworks</th>
                <th className="py-3 px-4">Submission Due Date</th>
                <th className="py-3 px-4 text-center">Current Status</th>
                <th className="py-3 px-4">Submitted Documents</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400/70 text-xs">
              {requirements.map((req) => (
                <tr key={req._id} className="hover:bg-slate-200/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold dark:text-white">{req.title}</div>
                    <div className="text-[11px]   mt-0.5 line-clamp-1">{req.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {req.period}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      {req.linkedCompliances.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {formatDate(req.dueDate)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.submissionStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      {req.submittedDriveLinks.length > 0 ? (
                        req.submittedDriveLinks.map((link, i) => (
                          <DriveLinkBadge key={i} url={link.url} label={link.description || 'Drive Document'} billDetails={link.billDetails} utilityConnectionSnapshot={link.utilityConnectionSnapshot} facilityId={req.facilityId} />
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs italic">No document submitted</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setDriveUrl('');
                        setFileDescription('');
                        setConnection({ providerName: req.utilityConnection?.providerName || '', connectionType: req.utilityConnection?.connectionType || '', subDivision: req.utilityConnection?.subDivision || '', circle: req.utilityConnection?.circle || '', consumerAccountNumber: req.utilityConnection?.consumerAccountNumber || '', consumerName: req.utilityConnection?.consumerName || '', meterNumber: req.utilityConnection?.meterNumber || '', contractDemand: req.utilityConnection?.contractDemand || '' });
                        setBill({ invoiceNumber: '', billingFrom: '', billingTo: '', consumptionKwh: '', billAmount: '' });
                      }}
                      className="px-2 py-1.5 w-28 text-xs font-semibold rounded-md bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-sm"
                    >
                      + Submit Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Link Submission Modal (Acceptance Step 6) */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">

          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-1">
              Submit Google Drive Evidence
            </h3>
            <p className="text-xs   mb-4">
              Requirement: <strong className="   dark:text-white">{selectedReq.title}</strong>
            </p>

            <form noValidate onSubmit={handleSubmitDriveLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Drive Link (URL):
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg    dark:text-white focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ensure link sharing permission is set to viewable by Carbon Crunch consultants.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Description / File Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Monthly Grid Consumption Excel (Apr-Jun 2025)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg    dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {isElectricityRequest && <>
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div><h4 className="text-xs font-bold text-white">Facility electricity connection</h4><p className="text-[10px] text-slate-500">Saved against this facility and reused for its future submissions.</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([['providerName','Electricity provider'],['connectionType','Connection type'],['subDivision','Sub-division'],['circle','Circle'],['consumerAccountNumber','Consumer account number'],['consumerName','Consumer name'],['meterNumber','Meter number'],['contractDemand','Contract demand']] as const).map(([key,label]) => <label key={key} className="block text-xs text-slate-300">{label}<input required value={connection[key]} onChange={(e) => setConnectionField(key,e.target.value)} placeholder={label} className="mt-1 w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-600" /></label>)}
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div><h4 className="text-xs font-bold text-white">This electricity bill</h4><p className="text-[10px] text-slate-500">These values belong only to this bill submission.</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([['invoiceNumber','Invoice number'],['billingFrom','Billing period from'],['billingTo','Billing period to'],['consumptionKwh','Consumption (kWh)'],['billAmount','Bill amount (₹)']] as const).map(([key,label]) => <label key={key} className="block text-xs text-slate-300">{label}<input required type={key === 'billingFrom' || key === 'billingTo' ? 'date' : key === 'consumptionKwh' || key === 'billAmount' ? 'number' : 'text'} min={key === 'consumptionKwh' || key === 'billAmount' ? '0' : undefined} step={key === 'consumptionKwh' || key === 'billAmount' ? 'any' : undefined} value={bill[key]} onChange={(e) => setBillField(key,e.target.value)} placeholder={label} className="mt-1 w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-600" /></label>)}
                </div>
              </div>
              </>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormPreviewOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white border border-emerald-700 rounded-md"
                >
                  Preview entered data
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedReq(null); setIsFormPreviewOpen(false); }}
                  className="px-3 py-1.5 text-xs text-black hover:text-white border border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Upload Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReq && isElectricityRequest && (
        <EvidenceDocumentModal
          isOpen={isFormPreviewOpen}
          onClose={() => setIsFormPreviewOpen(false)}
          url={driveUrl.trim()}
          label={`Electricity bill preview · ${selectedReq.title}`}
          facilityId={selectedReq.facilityId}
          utilityConnectionSnapshot={connection}
          billDetails={{
            invoiceNumber: bill.invoiceNumber,
            billingFrom: bill.billingFrom,
            billingTo: bill.billingTo,
            consumptionKwh: Number(bill.consumptionKwh),
            billAmount: Number(bill.billAmount),
          }}
        />
      )}
    </div>
  );
}
