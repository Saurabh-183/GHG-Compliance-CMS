'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  File,
  Folder,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Tags,
  Search,
  Building2,
  Factory,
  Loader2,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/lib/notify';

type DriveItem = {
  driveId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
  isFolder: boolean;
  pathNames?: string[];
  mappingType?: string;
  clientGroupId?: string;
  facilityId?: string;
  financialYear?: string;
  category?: string;
  mappingConfidence?: string;
  isIndexed?: boolean;
};

type FacilityOption = {
  facilityId: string;
  name: string;
  clientGroupId?: string;
  clientGroupName?: string;
  location?: string;
  category?: string;
};

export default function DriveExplorerPage() {
  const { currentRole, currentUser } = useAuth();
  const [items, setItems] = useState<DriveItem[]>([]);
  const [parentId, setParentId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [activeFacility, setActiveFacility] = useState('');
  const [vaultUnavailable, setVaultUnavailable] = useState(false);
  const [stack, setStack] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DriveItem | null>(null);
  const [mappingType, setMappingType] = useState('FACILITY');
  const [mappingValue, setMappingValue] = useState('');
  const [mappingBusy, setMappingBusy] = useState(false);

  // Facility Autocomplete & Debounce State
  const [allFacilities, setAllFacilities] = useState<FacilityOption[]>([]);
  const [facilityInput, setFacilityInput] = useState('');
  const [debouncedFacilityQuery, setDebouncedFacilityQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const facilityContainerRef = useRef<HTMLDivElement>(null);

  // Fetch facilities catalog on mount for suggestions
  useEffect(() => {
    let mounted = true;
    async function fetchFacilitiesList() {
      try {
        const res = await fetch('/api/facilities', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && Array.isArray(json.data)) {
            setAllFacilities(json.data);
          }
        }
      } catch (e) {
        console.warn('Could not load facilities list for Drive Explorer:', e);
      }
    }
    void fetchFacilitiesList();
    return () => {
      mounted = false;
    };
  }, []);

  // Debounce Facility Input
  useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedFacilityQuery(facilityInput);
      setIsDebouncing(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [facilityInput]);

  // Close suggestions popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        facilityContainerRef.current &&
        !facilityContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadItems = useCallback(
    async (nextParent = '', nextFacility = activeFacility) => {
      setLoading(true);
      setError('');
      setVaultUnavailable(false);
      try {
        const params = new URLSearchParams();
        if (nextParent) params.set('parentId', nextParent);
        if (nextFacility) params.set('facilityId', nextFacility);
        const response = await fetch(`/api/drive/tree?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = await response.json();
        if (!response.ok || !json.success)
          throw new Error(json.error || 'Could not load Drive items.');
        setItems(json.data || []);
        setParentId(nextParent);
        setActiveFacility(nextFacility.trim());
        setVaultUnavailable(Boolean(json.vaultUnavailable));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load Drive items.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [activeFacility]
  );

  useEffect(() => {
    const queryFacility = new URLSearchParams(window.location.search).get(
      'facilityId'
    );
    if (queryFacility) {
      const normalized = queryFacility.toUpperCase();
      setFacilityId(normalized);
      setFacilityInput(normalized);
      void loadItems('', normalized);
    } else if (
      currentUser?.authorizedFacilityIds &&
      currentUser.authorizedFacilityIds.length > 0
    ) {
      const first = currentUser.authorizedFacilityIds[0].toUpperCase();
      setFacilityId(first);
      setFacilityInput(first);
      void loadItems('', first);
    } else {
      void loadItems('', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Filtered suggestions based on debounced search
  const filteredSuggestions = useMemo(() => {
    const q = debouncedFacilityQuery.trim().toLowerCase();
    if (!q) {
      return allFacilities.slice(0, 8);
    }
    return allFacilities
      .filter((fac) => {
        const idMatch = fac.facilityId?.toLowerCase().includes(q);
        const nameMatch = fac.name?.toLowerCase().includes(q);
        const companyMatch = fac.clientGroupName?.toLowerCase().includes(q);
        const locMatch = fac.location?.toLowerCase().includes(q);
        const catMatch = fac.category?.toLowerCase().includes(q);
        return idMatch || nameMatch || companyMatch || locMatch || catMatch;
      })
      .slice(0, 10);
  }, [allFacilities, debouncedFacilityQuery]);

  const visibleItems = items;

  const openFolder = async (item: DriveItem) => {
    if (item.isFolder && (await loadItems(item.driveId))) {
      setStack((current) => [...current, { id: item.driveId, name: item.name }]);
    }
  };

  const goBack = async () => {
    const next = stack.slice(0, -1);
    if (await loadItems(next.at(-1)?.id || '')) {
      setStack(next);
    }
  };

  const handleSelectFacility = (fac: FacilityOption) => {
    const id = fac.facilityId.toUpperCase();
    setFacilityInput(id);
    setFacilityId(id);
    setShowSuggestions(false);
    void loadItems('', id).then((ok) => {
      if (ok) {
        setStack([]);
        setSelected(null);
      }
    });
  };

  const loadFacility = async () => {
    const target = facilityInput.trim().toUpperCase() || facilityId;
    if (await loadItems('', target)) {
      setFacilityId(target);
      setShowSuggestions(false);
      setStack([]);
      setSelected(null);
    }
  };

  const runDiscovery = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/drive/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await response.json();
      if (!response.ok || !json.success)
        throw new Error(json.error || 'Drive discovery failed.');
      setStack([]);
      await loadItems('');
      notify.success(`Discovery complete: ${json.data.totalItems} items indexed.`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Drive discovery failed.';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const saveMapping = async () => {
    if (!selected) return;
    setMappingBusy(true);
    setError('');
    try {
      const body: Record<string, string> = { driveId: selected.driveId, mappingType };
      if (mappingType === 'CLIENT_GROUP') body.clientGroupId = mappingValue;
      if (mappingType === 'FACILITY') body.facilityId = mappingValue;
      if (mappingType === 'FINANCIAL_YEAR') body.financialYear = mappingValue;
      if (mappingType === 'CATEGORY') body.category = mappingValue;
      const response = await fetch('/api/drive/map', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.success)
        throw new Error(json.error || 'Mapping failed.');
      notify.success('Folder mapping saved successfully.');
      setSelected(null);
      await loadItems(parentId);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Mapping failed.';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setMappingBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">
      <div className="mx-auto max-w-8xl space-y-6">
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

        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 relative">
          <div ref={facilityContainerRef} className="relative min-w-72 flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Facility ID / Search
              <span className="ml-1 text-xs text-slate-400 font-normal">
                (Type letters to see suggestions)
              </span>
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                value={facilityInput}
                onChange={(e) => {
                  setFacilityInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setShowSuggestions(false);
                    if (filteredSuggestions.length > 0 && debouncedFacilityQuery.trim()) {
                      handleSelectFacility(filteredSuggestions[0]);
                    } else {
                      void loadFacility();
                    }
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Type facility name or code (e.g. TRIDENT, MOHIT, AMAN)..."
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-800 py-2 pl-9 pr-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:border-slate-700 focus:outline-none focus:border-[#17365D] dark:focus:border-emerald-500 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />

              <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                {isDebouncing && (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                )}
                {facilityInput && !isDebouncing && (
                  <button
                    type="button"
                    onClick={() => {
                      setFacilityInput('');
                      setShowSuggestions(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions Dropdown Popover */}
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>
                    {debouncedFacilityQuery.trim()
                      ? `Matching Facilities (${filteredSuggestions.length})`
                      : `Suggested Facilities (${filteredSuggestions.length})`}
                  </span>
                  <span className="text-[10px] lowercase text-slate-400">press enter to select</span>
                </div>

                {filteredSuggestions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No facilities found matching "{debouncedFacilityQuery}".
                  </div>
                ) : (
                  filteredSuggestions.map((fac) => {
                    const isSelected = activeFacility.toUpperCase() === fac.facilityId.toUpperCase();
                    return (
                      <button
                        key={fac.facilityId}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectFacility(fac);
                        }}
                        className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'hover:bg-slate-100 text-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              {fac.facilityId}
                            </span>
                            <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                              {fac.name}
                            </span>
                          </div>
                          {(fac.clientGroupName || fac.category || fac.location) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {fac.clientGroupName && (
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {fac.clientGroupName}
                                </span>
                              )}
                              {fac.location && <span>• {fac.location}</span>}
                              {fac.category && <span>• {fac.category}</span>}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            onClick={loadFacility}
            disabled={loading}
            className="rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white px-4 py-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Loading...' : 'Load facility'}
          </button>
        </section>

        {vaultUnavailable && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">The facility vault is temporarily unavailable. Showing indexed Drive items.</p>}

        {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <button onClick={goBack} disabled={loading || !stack.length} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowLeft size={17} /></button>
            <span className="text-sm font-medium">{activeFacility || 'Drive root'}</span>
            {stack.map((crumb) => <span key={crumb.id} className="flex items-center gap-2 text-sm text-slate-500"><ChevronRight size={14} />{crumb.name}</span>)}
            <span className="ml-auto text-xs text-slate-500">{visibleItems.length} items</span>
          </div>
          {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading Drive contents…</div> : visibleItems.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{activeFacility ? 'No files or folders found here.' : 'Load a facility to browse its Drive vault.'}</div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleItems.map((item) => <div key={item.driveId} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button onClick={() => openFolder(item)} disabled={!item.isFolder} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                  {item.isFolder ? <Folder className="shrink-0 text-amber-500" size={20} /> : <File className="shrink-0 text-slate-400" size={20} />}
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.financialYear || 'Year not mapped'}{item.facilityId ? ` · ${item.facilityId}` : ''}{item.category ? ` · ${item.category}` : ''}</span></span>
                </button>
                {item.mappingType && item.mappingType !== 'UNMAPPED' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{item.mappingType}</span>}
                {item.webViewLink && <a href={item.webViewLink} target="_blank" rel="noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Open in Google Drive"><ExternalLink size={16} /></a>}
                {currentRole === 'ADMIN' && item.isFolder && item.isIndexed && <button onClick={() => { setSelected(item); setMappingValue(''); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"><Tags size={13} className="mr-1 inline" />Map</button>}
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
