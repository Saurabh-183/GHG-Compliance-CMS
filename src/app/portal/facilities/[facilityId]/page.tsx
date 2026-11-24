'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { IDataRequirement, IFacility } from '@/types';
import { computePortalDataRequestPercentages } from '@/lib/requestStats';
import {
  type ClientSubmittedDriveFileCard,
  listClientSubmittedDriveFiles,
} from '@/lib/clientMonthlyEvidenceRows';
import {
  buildPortalScopeQuery,
  readPortalPeriod,
  PORTAL_PERIOD_OPTIONS,
  writePortalScope,
} from '@/lib/portalScope';
import {
  ChevronRight,
  Folder,
  ExternalLink,
  TrendingUp,
  CheckCheck,
} from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import {
  GOOGLE_DRIVE_FOLDER_URL,
  resolveComplianceVaultFolderUrl,
  rewriteLegacyVaultUrlsInText,
} from '@/lib/gdrive';

export default function ClientFacilityOverviewPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const params = useParams();
  const facilityId = (params.facilityId as string) || 'TRIDENT_PAPER';
  const [facility, setFacility] = useState<IFacility | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<ClientSubmittedDriveFileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(() => readPortalPeriod());
  const [requestProgress, setRequestProgress] = useState(
    computePortalDataRequestPercentages([])
  );
  useEffect(() => {
    writePortalScope(facilityId, selectedPeriod);
  }, [facilityId, selectedPeriod]);

  useEffect(() => {
    async function loadData() {
      try {
        const reqParams = new URLSearchParams({
          facilityId: facilityId.toUpperCase(),
          period: selectedPeriod,
        });
        const [facRes, reqRes] = await Promise.all([
          fetch(`/api/facilities/${facilityId}`).catch(() => null),
          fetch(`/api/requirements?${reqParams.toString()}`, {
            credentials: 'include',
            cache: 'no-store',
          }).catch(() => null),
        ]);

        if (facRes && facRes.ok) {
          const facData = (await facRes.json()) as { data: IFacility };
          setFacility(facData.data);
        }
        let scopedReqs: IDataRequirement[] = [];
        if (reqRes && reqRes.ok) {
          const reqJson = (await reqRes.json()) as { data?: IDataRequirement[] };
          scopedReqs = (reqJson.data || []).filter(
            (r) =>
              r.facilityId?.toUpperCase() === facilityId.toUpperCase() && r.period === selectedPeriod
          );
          setRequestProgress(computePortalDataRequestPercentages(scopedReqs));
          setSubmissionFiles(listClientSubmittedDriveFiles(scopedReqs));
        } else {
          setRequestProgress(computePortalDataRequestPercentages([]));
          setSubmissionFiles([]);
        }
      } catch (err) {
        console.error('Error fetching facility data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [facilityId, selectedPeriod]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading facility compliance overview..." />;
  }

  if (!facility) {
    return (
      <div className="max-w-8xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Facility Not Found</h2>
        <Link href="/portal" className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 text-xs">
          Return to Portal
        </Link>
      </div>
    );
  }

  const {
    dataGivenPercentage,
    dataMatchedPercentage,
    givenCount,
    matchedCount,
    auditedCount,
    total: requestTotal,
  } = requestProgress;
  const dataRequestsHref = `/portal/requests${buildPortalScopeQuery(facilityId, selectedPeriod)}`;
  const driveFolderUrl = resolveComplianceVaultFolderUrl(
    facility?.driveConnection?.folderUrl ||
    submissionFiles.find((f) => f.vaultFolderUrl)?.vaultFolderUrl ||
    GOOGLE_DRIVE_FOLDER_URL
  );

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link href="/portal" className="hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-500 dark:text-slate-400">Client Portal</Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900 dark:text-white font-semibold">{facility.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-sm dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {facility.facilityId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {facility.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20">
                Active DC
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {facility.category} · {facility.location}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mr-1">
              <span className="font-semibold whitespace-nowrap">FY</span>
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <Select
                  value={selectedPeriod}
                  onChange={(e: SelectChangeEvent) => setSelectedPeriod(e.target.value)}
                  sx={{
                    height: 34,
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#020617' : '#FFFFFF',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? '#34D399' : '#059669',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? '#34D399' : '#059669',
                      borderWidth: '1.5px',
                    },
                    '& .MuiSelect-select': {
                      py: '5px',
                      px: '10px',
                    },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          mt: 0.5,
                          maxHeight: 280,
                          borderRadius: '8px',
                          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          color: isDark ? '#FFFFFF' : '#0F172A',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                          boxShadow: isDark
                            ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                            : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                          '& .MuiList-root': { py: '4px' },
                        },
                      },
                    },
                  }}
                >
                  {PORTAL_PERIOD_OPTIONS.map((fy) => (
                    <MenuItem key={fy} value={fy} sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {fy}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <Link
              href={dataRequestsHref}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 shadow-sm transition-colors cursor-pointer"
            >
              View Data Requests
            </Link>
          </div>
        </div>

        {/* Data request progress (same scope as /portal/requests) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{dataGivenPercentage}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {requestTotal > 0
                ? `${givenCount} of ${requestTotal} consultant data requests submitted (${selectedPeriod})`
                : `No data requests for ${selectedPeriod} — open Data Requests when assigned`}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{dataMatchedPercentage}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {auditedCount > 0
                ? `${matchedCount} of ${auditedCount} submitted requests accepted by consultant`
                : requestTotal > 0
                  ? 'No submissions under consultant review yet'
                  : '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Submitted Evidence</span>
              <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{submissionFiles.length} Files</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Links submitted on consultant data requests ({selectedPeriod})
            </p>
          </div>
        </div>
      </div>

      {/* Client-submitted Drive links from consultant data requests only */}
      {submissionFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Submitted evidence ({submissionFiles.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drive or vault links you added when responding to consultant data requests for this facility.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={dataRequestsHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors self-start sm:self-center cursor-pointer"
              >
                <span>Manage on Data Requests</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {submissionFiles.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 truncate max-w-[60%]">
                      {f.category.replace(/_/g, ' ')}
                    </span>
                    {f.month && (
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                        {f.month}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={f.name}>
                    {f.name}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" title={f.requestTitle}>
                    {f.requestTitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {f.submittedBy ? `${f.submittedBy}` : 'Client upload'}
                    {f.submittedAt
                      ? ` · ${new Date(f.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''}
                  </span>
                  <a
                    href={rewriteLegacyVaultUrlsInText(f.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
                  >
                    <span>Open file</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
