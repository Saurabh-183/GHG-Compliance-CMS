'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, File, Folder, HardDrive, RefreshCw, ExternalLink, Tags } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type DriveItem = {
  driveId: string; name: string; mimeType: string; webViewLink?: string; size?: string;
  modifiedTime?: string; isFolder: boolean; pathNames?: string[]; mappingType?: string;
  clientGroupId?: string; facilityId?: string; financialYear?: string; category?: string;
  mappingConfidence?: string;
};

export default function DriveExplorerPage() {
  const { currentRole } = useAuth();
  const [items, setItems] = useState<DriveItem[]>([]);
  const [parentId, setParentId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [stack, setStack] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DriveItem | null>(null);
  const [mappingType, setMappingType] = useState('FACILITY');
  const [mappingValue, setMappingValue] = useState('');
  const [mappingBusy, setMappingBusy] = useState(false);

  const loadItems = useCallback(async (nextParent = '', nextFacility = facilityId) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (nextParent) params.set('parentId', nextParent);
      if (nextFacility) params.set('facilityId', nextFacility);
      const response = await fetch(`/api/drive/tree?${params.toString()}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Could not load Drive items.');
      setItems(json.data || []);
      setParentId(nextParent);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load Drive items.'); }
    finally { setLoading(false); }
  }, [facilityId]);

  useEffect(() => {
    const queryFacility = new URLSearchParams(window.location.search).get('facilityId');
    if (queryFacility) {
      const normalized = queryFacility.toUpperCase();
      setFacilityId(normalized);
      void loadItems('', normalized);
    } else {
      void loadItems('', '');
    }
    // Initial page load only; subsequent navigation is handled by the controls below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const openFolder = (item: DriveItem) => {
    if (!item.isFolder) return;
    setStack((current) => [...current, { id: item.driveId, name: item.name }]);
    void loadItems(item.driveId);
  };

  const goBack = () => {
    const next = stack.slice(0, -1);
    setStack(next);
    void loadItems(next.length ? next[next.length - 1].id : '', facilityId);
  };

  const runDiscovery = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/drive/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Drive discovery failed.');
      setStack([]); await loadItems('', facilityId);
      window.alert(`Discovery complete: ${json.data.totalItems} items, ${json.data.folders} folders and ${json.data.files} files indexed.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Drive discovery failed.'); }
    finally { setLoading(false); }
  };

  const saveMapping = async () => {
    if (!selected) return;
    setMappingBusy(true); setError('');
    try {
      const body: Record<string, string> = { driveId: selected.driveId, mappingType };
      if (mappingType === 'CLIENT_GROUP') body.clientGroupId = mappingValue;
      if (mappingType === 'FACILITY') body.facilityId = mappingValue;
      if (mappingType === 'FINANCIAL_YEAR') body.financialYear = mappingValue;
      if (mappingType === 'CATEGORY') body.category = mappingValue;
      const response = await fetch('/api/drive/map', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Mapping failed.');
      setSelected(null); await loadItems(parentId, facilityId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Mapping failed.'); }
    finally { setMappingBusy(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Google Drive Explorer
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Browse existing client folders and map them to application records.
              </p>
            </div>
          </div>
          {currentRole === 'ADMIN' && (
            <button
              onClick={runDiscovery}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap self-start sm:self-center cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Discover / Refresh Drive</span>
            </button>
          )}
        </header>

        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="min-w-64 flex-1 text-sm text-slate-700 dark:text-slate-300">
            Facility ID (required for consultant/client access)
            <input
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value.toUpperCase())}
              placeholder="e.g. NR_AGARWAL_UNIT_1"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:border-slate-700"
            />
          </label>
          <button
            onClick={() => { setStack([]); void loadItems('', facilityId); }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Load facility
          </button>
          <label className="min-w-56 flex-1 text-sm text-slate-700 dark:text-slate-300">
            Search this folder
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file or folder name"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:border-slate-700"
            />
          </label>
        </section>

        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <button onClick={goBack} disabled={!stack.length} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowLeft size={17} /></button>
            <span className="text-sm font-medium">Drive root</span>
            {stack.map((crumb, index) => <span key={crumb.id} className="flex items-center gap-2 text-sm text-slate-500"><ChevronRight size={14} />{crumb.name}</span>)}
            <span className="ml-auto text-xs text-slate-500">{visibleItems.length} items</span>
          </div>
          {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading Drive contents…</div> : visibleItems.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No indexed items found. An administrator should run Drive discovery first, then map company and facility folders.</div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleItems.map((item) => <div key={item.driveId} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button onClick={() => openFolder(item)} disabled={!item.isFolder} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                  {item.isFolder ? <Folder className="shrink-0 text-amber-500" size={20} /> : <File className="shrink-0 text-slate-400" size={20} />}
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.financialYear || 'Year not mapped'}{item.facilityId ? ` · ${item.facilityId}` : ''}{item.category ? ` · ${item.category}` : ''}</span></span>
                </button>
                {item.mappingType && item.mappingType !== 'UNMAPPED' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{item.mappingType}</span>}
                {item.webViewLink && <a href={item.webViewLink} target="_blank" rel="noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Open in Google Drive"><ExternalLink size={16} /></a>}
                {currentRole === 'ADMIN' && item.isFolder && <button onClick={() => { setSelected(item); setMappingValue(''); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"><Tags size={13} className="mr-1 inline" />Map</button>}
              </div>)}
            </div>
          )}
        </section>

        {currentRole === 'ADMIN' && selected && <section className="rounded-xl border border-emerald-200 bg-white p-5 dark:border-emerald-900/60 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">Map folder: {selected.name}</h2><p className="text-xs text-slate-500 dark:text-slate-400">This mapping applies to all indexed descendants. It does not move or rename Drive files.</p></div><button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Close</button></div>
          <div className="flex flex-wrap gap-3">
            <select value={mappingType} onChange={(e) => setMappingType(e.target.value)} className="rounded-lg border border-slate-300 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm dark:border-slate-700"><option value="CLIENT_GROUP">Company / Client Group</option><option value="FACILITY">Facility</option><option value="FINANCIAL_YEAR">Financial Year</option><option value="CATEGORY">Document Category</option></select>
            <input value={mappingValue} onChange={(e) => setMappingValue(e.target.value)} placeholder={mappingType === 'CLIENT_GROUP' ? 'Company code or Client Group ID' : mappingType === 'FACILITY' ? 'Facility ID' : mappingType === 'FINANCIAL_YEAR' ? 'FY2025-26' : 'e.g. DISCOM_Utility_Bills'} className="min-w-64 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
            <button onClick={saveMapping} disabled={mappingBusy || !mappingValue.trim()} className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer">{mappingBusy ? 'Saving…' : 'Save mapping'}</button>
          </div>
        </section>}
      </div>
    </main>
  );
}
