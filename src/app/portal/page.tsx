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

  // Strict RBAC: Consultants cannot enter the external Client Portal
  if (currentRole !== 'CLIENT' && currentRole !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-md">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Client Portal Area</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Your active account role is <strong className="text-emerald-700 dark:text-emerald-400">{currentRole}</strong>.
          The Client Portal is reserved exclusively for external industrial client representatives (e.g., Trident Group) to upload Google Drive evidence and answer clarification queries.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs text-white font-semibold shadow-sm transition-colors"
          >
            <span>Return to Internal Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Client Group Overview Hero */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              Authorized Client Organization
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {clientOrgName === 'TRIDENT' ? 'Trident Group' : clientOrgName} — Compliance Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
              Welcome, <strong className="text-emerald-700 dark:text-emerald-400">{currentUser?.name || 'Vikram Singh'}</strong> ({currentUser?.designation || 'Head of Regulatory Affairs'}).
              Direct visibility into authorized facilities, outstanding data submissions, Google Drive repository evidence, and verified historical reports.
            </p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Compliance Excel Templates</span>
            </button>

            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-xs shadow-xs transition-colors whitespace-nowrap"
            >
              <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Drive Evidence Vault</span>
            </button>
          </div>
        </div>

        {/* PRD Highlights: Data Given % & Data Matched % */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">100%</div>
            <p className="text-[11px] text-slate-500">12/12 months submitted by your units</p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">75.0%</div>
            <p className="text-[11px] text-slate-500">3 of 4 audited months verified</p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Operating Facilities</span>
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{facilities.length} Units</div>
            <p className="text-[11px] text-slate-500">Paper, Yarn, Home Textiles</p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Action Items</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400">{openClarifications.length} Query</div>
            <p className="text-[11px] text-slate-500">June 2025 PSPCL Bill Clarification</p>
          </div>
        </div>
      </div>

      {/* Action Required: Discrepancy & Clarification Response */}
      {openClarifications.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-slate-800 border border-rose-500/40 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg text-rose-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-rose-300 dark:text-rose-400 dark:border-rose-500/30">
                  Regulatory Query / Clarification Raised by Carbon Crunch
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-gray-800 mt-2">
                Consultant flagged a 15,000 kWh variance between your June 2025 Excel and electricity bill. Please provide explanation or revised bill.
              </p>
            </div>
          </div>

          <Link
            href="/portal/submissions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
          >
            <span>Respond with Revised Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Authorized Facilities Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Your Authorized Operating Facilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div
              key={facility._id}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{facility.location}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{facility.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{facility.category}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px]  ">
                  Obligations: <strong>RCO, PAT, CCTS, CEA</strong>
                </span>
                <Link
                  href={`/portal/facilities/${facility.facilityId}`}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>View Overview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Data Requests Table */}
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Outstanding Compliance Data Requests
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submit monthly energy logs, utility bills, and fuel lab test reports by attaching Google Drive URLs.
            </p>
          </div>
          <Link
            href="/portal/requests"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>View All ({pendingRequests.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

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

      {/* Approved Historical Assessments & Reports */}
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Released & Approved Compliance Filings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Official filings and submission acknowledgements certified by Carbon Crunch auditor.
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

      {/* Google Drive Evidence Vault Repository Files */}
      {driveFiles.length > 0 && (
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Google Drive Corporate Compliance Vault ({driveFiles.length} Documents)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official invoices, energy sheets, and certificates residing directly in the Google Drive compliance repository.
              </p>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md text-blue-600 border border-blue-600/60 hover:bg-blue-600 hover:text-white transition-colors self-start sm:self-center"
            >
              <span>Browse Google Drive Folder</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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
