'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IDataset, IClarification } from '@/types';
import { ReconciliationTable } from '@/components/compliance/ReconciliationTable';
import { useAuth } from '@/context/AuthContext';
import { ChevronRight, FileSpreadsheet, Building2 } from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function DatasetVerifyPage() {
  const params = useParams();
  const datasetId = params.datasetId as string;
  const { currentRole } = useAuth();
  const [dataset, setDataset] = useState<IDataset | null>(null);
  const [clarifications, setClarifications] = useState<IClarification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // First try to fetch by id; if not found, fetch the primary dataset for TRIDENT_PAPER
      let res = await fetch(`/api/datasets/${datasetId}`);
      if (!res.ok) {
        res = await fetch(`/api/datasets?facilityId=TRIDENT_PAPER`);
        if (res.ok) {
          const listJson = (await res.json()) as { data: IDataset[] };
          if (listJson.data && listJson.data.length > 0) {
            setDataset(listJson.data[0]);
          }
        }
      } else {
        const json = (await res.json()) as { data: IDataset };
        setDataset(json.data);
      }

      // Fetch clarifications for this facility
      const clarRes = await fetch(`/api/clarifications?facilityId=TRIDENT_PAPER`);
      if (clarRes.ok) {
        const clarJson = (await clarRes.json()) as { data: IClarification[] };
        setClarifications(clarJson.data);
      }
    } catch (err) {
      console.error('Error fetching dataset verification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datasetId]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading Verification Reconciliation Engine..." />;
  }

  if (!dataset) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Dataset Not Found</h2>
        <Link href="/facilities/TRIDENT_PAPER" className="mt-4 inline-block text-emerald-400 text-xs">
          Return to Facility Matrix
        </Link>
      </div>
    );
  }

  const isReviewer = currentRole === 'REVIEWER' || currentRole === 'ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/facilities/TRIDENT_PAPER" className="hover:text-emerald-400">Trident Paper</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link href="/facilities/TRIDENT_PAPER" className="hover:text-emerald-400">Compliance Matrix</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">Grid Electricity Reconciliation</span>
      </div>

      {/* Main Reconciliation Engine Component */}
      <ReconciliationTable
        initialDataset={dataset}
        initialClarifications={clarifications}
        isReviewer={isReviewer}
        onRefresh={() => loadData()}
      />
    </div>
  );
}
