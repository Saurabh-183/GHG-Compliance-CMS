'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FacilityDataRequestPanel } from '@/components/requests/FacilityDataRequestPanel';
import { ChecklistDrivenRequestWizard } from '@/components/requests/ChecklistDrivenRequestWizard';
import type { IFacility, IClientGroup } from '@/types';
import { FileSpreadsheet } from 'lucide-react';

export default function DataRequestsPage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [organizations, setOrganizations] = useState<IClientGroup[]>([]);
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [orgRes, facRes] = await Promise.all([
          fetch('/api/client-groups', { credentials: 'include' }),
          fetch('/api/facilities', { credentials: 'include' }),
        ]);
        const orgJson = await orgRes.json();
        const facJson = await facRes.json();
        const list: IFacility[] = facJson.data || [];
        const orgs: IClientGroup[] = orgJson.data || [];
        setFacilities(list);
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setOrganizationId((prev) => prev || orgs[0]._id);
        }
        if (list.length > 0) {
          setSelectedFacilityId((prev) => {
            const id = prev || list[0].facilityId;
            const f = list.find((x) => x.facilityId === id) || list[0];
            setFacilityName(f.name);
            if (f.clientGroupId) setOrganizationId(f.clientGroupId);
            return f.facilityId;
          });
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const facilitiesInOrg = useMemo(() => {
    if (!organizationId) return facilities;
    return facilities.filter((f) => f.clientGroupId === organizationId);
  }, [facilities, organizationId]);

  const handleOrganizationChange = (orgId: string) => {
    setOrganizationId(orgId);
    const inOrg = facilities.filter((f) => f.clientGroupId === orgId);
    if (inOrg.length > 0) {
      setSelectedFacilityId(inOrg[0].facilityId);
      setFacilityName(inOrg[0].name);
    } else {
      setSelectedFacilityId('');
      setFacilityName('');
    }
  };

  const handleFacilityChange = (id: string) => {
    setSelectedFacilityId(id);
    const found = facilities.find((f) => f.facilityId === id);
    setFacilityName(found?.name || '');
    if (found?.clientGroupId) setOrganizationId(found.clientGroupId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="pb-6 border-b border-slate-200 dark:border-slate-800">
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
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-2">
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Organization</span>
          <select
            value={organizationId}
            onChange={(e) => handleOrganizationChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Facility / unit</span>
          <select
            value={selectedFacilityId}
            disabled={!organizationId}
            onChange={(e) => handleFacilityChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 disabled:opacity-50 dark:bg-slate-950"
          >
            {facilitiesInOrg.map((f) => (
              <option key={f.facilityId} value={f.facilityId}>
                {f.name} ({f.facilityId})
              </option>
            ))}
          </select>
        </label>
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