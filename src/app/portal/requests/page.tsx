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
  UploadCloud,
  X,
  Zap,
  Receipt,
  ShieldCheck,
  Info,
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
