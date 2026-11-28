'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { FacilityDataRequestPanel } from '@/components/requests/FacilityDataRequestPanel';
import { ChecklistDrivenRequestWizard } from '@/components/requests/ChecklistDrivenRequestWizard';
import type { IFacility, IClientGroup } from '@/types';
import { FileSpreadsheet } from 'lucide-react';
import { watchClientDirectory } from '@/lib/watchClientDirectory';

export default function DataRequestsPage() {
  const router = useRouter();
  const { theme, currentRole, currentUser } = useAuth();
  const isClient = currentRole === 'CLIENT' || currentUser?.role === 'CLIENT';

  useEffect(() => {
    if (isClient) {
      router.replace('/portal');
    }
  }, [isClient, router]);

  const isDark = theme === 'dark';
  const [requestedFacilityId, setRequestedFacilityId] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('facilityId')?.toUpperCase() || ''
  );
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [organizations, setOrganizations] = useState<IClientGroup[]>([]);
  const [requestedOrganizationId, setRequestedOrganizationId] = useState('');

  useEffect(() => {
    return watchClientDirectory(async () => {
      try {
        const [orgRes, facRes] = await Promise.all([
          fetch('/api/client-groups', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/facilities', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (!orgRes.ok || !facRes.ok) return;
        const orgJson = await orgRes.json();
        const facJson = await facRes.json();
        const list: IFacility[] = facJson.data || [];
        const orgs: IClientGroup[] = orgJson.data || [];
        setFacilities(list);
        setOrganizations(orgs);
      } catch {
        /* optional */
      }
    });
  }, []);

  const requestedFacility = facilities.find((facility) => facility.facilityId === requestedFacilityId);
  const organizationId = organizations.find((org) => org._id === requestedOrganizationId)?._id ||
    organizations.find((org) => org._id === requestedFacility?.clientGroupId)?._id ||
    organizations[0]?._id || '';
  const facilitiesInOrg = useMemo(() => {
    return facilities.filter((f) => f.clientGroupId === organizationId);
  }, [facilities, organizationId]);
  const selectedFacility = facilitiesInOrg.find((facility) => facility.facilityId === requestedFacilityId) || facilitiesInOrg[0];
  const selectedFacilityId = selectedFacility?.facilityId || '';
  const facilityName = selectedFacility?.name || '';

  const handleOrganizationChange = (orgId: string) => {
    setRequestedOrganizationId(orgId);
    setRequestedFacilityId('');
  };

  const handleFacilityChange = (id: string) => {
    setRequestedFacilityId(id);
    setRequestedOrganizationId(organizationId);
  };

  if (isClient) {
    return null;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="p-4 rounded-lg pb-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          Data Request Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
          Select organization and facility, then send checklist-backed bundled requests or a single custom request.
        </p>
      </header>

      <h2 className="text-xs font-bold uppercase text-slate-500">Client context</h2>
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Organization
          </label>
          <FormControl size="small" fullWidth>
            <Select
              value={organizationId}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              displayEmpty
              renderValue={(val) => {
                if (!val) {
                  return <span className="text-slate-400 dark:text-slate-500 font-sans text-xs">Select organization</span>;
                }
                const found = organizations.find((o) => o._id === val);
                return <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{found?.name || val}</span>;
              }}
              sx={{
                width: '100%',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#F8FAFC' : '#0F172A',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#475569' : '#94A3B8',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#34D399' : '#059669',
                  borderWidth: '1.5px',
                },
                '& .MuiSelect-select': {
                  py: '7.5px',
                  px: '12px',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiSvgIcon-root': {
                  color: isDark ? '#94A3B8' : '#64748B',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      maxHeight: 300,
                    },
                  },
                },
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: '12px' }}>
                Select organization
              </MenuItem>
              {organizations.map((org) => (
                <MenuItem
                  key={org._id}
                  value={org._id}
                  sx={{
                    fontSize: '12px',
                    fontWeight: organizationId === org._id ? 600 : 400,
                    color: organizationId === org._id ? (isDark ? '#34D399' : '#059669') : undefined,
                    '&.Mui-selected': {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.08)',
                    },
                  }}
                >
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Facility / unit
          </label>
          <FormControl size="small" fullWidth disabled={!organizationId || facilitiesInOrg.length === 0}>
            <Select
              value={selectedFacilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              displayEmpty
              renderValue={(val) => {
                if (!val) {
                  return <span className="text-slate-400 dark:text-slate-500 font-sans text-xs">Select facility / unit</span>;
                }
                const found = facilitiesInOrg.find((f) => f.facilityId === val);
                return (
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {found ? `${found.name} (${found.facilityId})` : val}
                  </span>
                );
              }}
              sx={{
                width: '100%',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#F8FAFC' : '#0F172A',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#475569' : '#94A3B8',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#34D399' : '#059669',
                  borderWidth: '1.5px',
                },
                '& .MuiSelect-select': {
                  py: '7.5px',
                  px: '12px',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiSvgIcon-root': {
                  color: isDark ? '#94A3B8' : '#64748B',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      maxHeight: 300,
                    },
                  },
                },
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: '12px' }}>
                Select facility / unit
              </MenuItem>
              {facilitiesInOrg.map((f) => (
                <MenuItem
                  key={f.facilityId}
                  value={f.facilityId}
                  sx={{
                    fontSize: '12px',
                    fontWeight: selectedFacilityId === f.facilityId ? 600 : 400,
                    color: selectedFacilityId === f.facilityId ? (isDark ? '#34D399' : '#059669') : undefined,
                    '&.Mui-selected': {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.08)',
                    },
                  }}
                >
                  {f.name} ({f.facilityId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      {selectedFacilityId && (
        <>
          <ChecklistDrivenRequestWizard facilityId={selectedFacilityId} facilityName={facilityName} />
          <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4" open>
            <summary className="text-xs font-bold text-slate-600 cursor-pointer">
              Single data request (checklist-driven fields)
            </summary>
            <div className="mt-4">
              <FacilityDataRequestPanel facilityId={selectedFacilityId} facilityName={facilityName} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
