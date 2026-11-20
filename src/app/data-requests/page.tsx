'use client';

import React, { useEffect, useState } from 'react';
import { ConsultantDataRequestManager } from '@/components/requests/ConsultantDataRequestManager';
import { FacilityDataRequestPanel } from '@/components/requests/FacilityDataRequestPanel';
import type { IFacility } from '@/types';
import { FileSpreadsheet } from 'lucide-react';

export default function DataRequestsPage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [facilityName, setFacilityName] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/facilities');
        const json = await res.json();
        const list: IFacility[] = json.data || [];
        if (list.length > 0) {
          setSelectedFacilityId((prev) => {
            if (prev) return prev;
            setFacilityName(list[0].name);
            return list[0].facilityId;
          });
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const handleFacilityChange = (id: string) => {
    setSelectedFacilityId(id);
    void fetch('/api/facilities')
      .then((r) => r.json())
      .then((json) => {
        const found = (json.data as IFacility[] | undefined)?.find((f) => f.facilityId === id);
        setFacilityName(found?.name || '');
      })
      .catch(() => undefined);
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
          Map BRSR templates to facilities, send structured requests to the client portal, and track status per category and reporting period.
        </p>
      </header>

      {selectedFacilityId && (
        <FacilityDataRequestPanel facilityId={selectedFacilityId} facilityName={facilityName} />
      )}

      <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <summary className="text-xs font-bold text-slate-600 cursor-pointer">Bulk BRSR template publishing (optional)</summary>
        <div className="mt-4">
          <ConsultantDataRequestManager
            selectedFacilityId={selectedFacilityId}
            onFacilityChange={handleFacilityChange}
          />
        </div>
      </details>
    </div>
  );
}