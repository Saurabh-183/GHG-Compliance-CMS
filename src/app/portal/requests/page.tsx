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
    if (!selectedReq || !driveUrl.trim()) {
      notify.warning('Please enter a valid Google Drive URL');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/requirements/${selectedReq._id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: driveUrl.trim(),
          description: fileDescription || 'Client submission via portal',
          ...(isElectricityRequest ? { utilityConnection: connection, billDetails: { ...bill, consumptionKwh: Number(bill.consumptionKwh), billAmount: Number(bill.billAmount) } } : {}),
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          message?: string;
          vault?: { folderPath?: string; uploadedToVault?: boolean };
        };
        notify.success(json.message || 'Document submitted to compliance vault.');
        setDriveUrl('');
        setFileDescription('');
        setSelectedReq(null);
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
                          <div key={i} className="space-y-0.5">
                            <DriveLinkBadge
                              url={link.vaultUrl || link.url}
                              label={link.description || 'Drive Document'}
                              billDetails={link.billDetails}
                              utilityConnectionSnapshot={link.utilityConnectionSnapshot}
                              facilityId={req.facilityId}
                            />
                            {link.vaultFolderPath && (
                              <div className="text-[9px] font-mono text-emerald-400/80 line-clamp-1 flex items-center gap-1">
                                <Folder className="w-3 h-3 shrink-0" />
                                {link.vaultFolderPath}
                              </div>
                            )}
                            {link.mappingStatus && (
                              <span className="text-[9px] text-slate-500">
                                Review: {link.mappingStatus}
                              </span>
                            )}
                          </div>
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

            <form onSubmit={handleSubmitDriveLink} className="space-y-4">
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
                  Share the file/folder with your Carbon Crunch service account (or &quot;Anyone with
                  link&quot;). The system copies it into the shared compliance Drive under{' '}
                  <span className="font-mono text-emerald-400/90">Client_Submissions/…</span>.
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
                  onClick={() => setSelectedReq(null)}
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
    </div>
  );
}
