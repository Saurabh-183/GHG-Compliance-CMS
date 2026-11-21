'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronDown, Layers } from 'lucide-react';
import {
  dedupeFacilitiesById,
  readPortalFacilityId,
  readPortalPeriod,
  writePortalScope,
} from '@/lib/portalScope';

type FacilityRow = { facilityId: string; name: string };

interface PortalFacilityNavDropdownProps {
  isLight: boolean;
  getNavLinkClass: (isActive: boolean) => string;
  /** Compact styling for mobile drawer */
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export function PortalFacilityNavDropdown({
  isLight,
  getNavLinkClass,
  variant = 'desktop',
  onNavigate,
}: PortalFacilityNavDropdownProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const urlFacilityId = pathname.match(/^\/portal\/facilities\/([^/]+)/i)?.[1]?.toUpperCase();
  const [selectedId, setSelectedId] = useState(() => readPortalFacilityId());

  const isActive = pathname.startsWith('/portal/facilities');

  const loadFacilities = useCallback(async () => {
    try {
      const res = await fetch('/api/facilities?portalScope=authorized', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: FacilityRow[] };
      const list = dedupeFacilitiesById(json.data || []);
      setFacilities(list);
      const stored = readPortalFacilityId();
      const next =
        urlFacilityId && list.some((f) => f.facilityId === urlFacilityId)
          ? urlFacilityId
          : stored && list.some((f) => f.facilityId === stored)
            ? stored
            : list[0]?.facilityId || '';
      if (next) {
        setSelectedId(next);
        writePortalScope(next, readPortalPeriod());
      }
    } catch {
      /* ignore */
    }
  }, [urlFacilityId]);

  useEffect(() => {
    void loadFacilities();
  }, [loadFacilities]);

  useEffect(() => {
    if (urlFacilityId) {
      setSelectedId(urlFacilityId);
      writePortalScope(urlFacilityId, readPortalPeriod());
    }
  }, [urlFacilityId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selectedLabel = facilities.find((f) => f.facilityId === selectedId)?.name;

  const pickFacility = (facilityId: string) => {
    setSelectedId(facilityId);
    writePortalScope(facilityId, readPortalPeriod());
    setOpen(false);
    onNavigate?.();
  };

  if (variant === 'mobile') {
    return (
      <div className="space-y-1">
        <div
          className={`px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          Facilities
        </div>
        <Link
          href="/portal"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
            pathname === '/portal'
              ? isLight
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border border-emerald-800/60 bg-emerald-950/60 text-emerald-300'
              : isLight
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4 text-emerald-600" />
          All facilities (overview)
        </Link>
        {facilities.map((f) => {
          const active = selectedId === f.facilityId && isActive;
          return (
            <Link
              key={f.facilityId}
              href={`/portal/facilities/${f.facilityId}`}
              onClick={() => pickFacility(f.facilityId)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
                active
                  ? isLight
                    ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border border-emerald-800/60 bg-emerald-950/60 text-emerald-300'
                  : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">{f.name}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${getNavLinkClass(
          isActive
        )}`}
      >
        <Building2
          className={`h-3.5 w-3.5 shrink-0 ${
            isActive
              ? isLight
                ? 'text-emerald-700'
                : 'text-emerald-400'
              : isLight
                ? 'text-slate-500'
                : 'text-slate-400'
          }`}
        />
        <span>Facilities</span>
        {selectedLabel && (
          <span
            className={`hidden max-w-[8rem] truncate xl:inline text-[10px] font-normal ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
            title={selectedLabel}
          >
            · {selectedLabel}
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 top-full z-50 mt-1 min-w-[15rem] max-w-[20rem] rounded-lg border py-1 shadow-lg ${
            isLight
              ? 'border-slate-200 bg-white text-slate-900'
              : 'border-slate-700 bg-slate-900 text-white'
          }`}
        >
          <Link
            href="/portal"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 ${
              pathname === '/portal' ? 'text-emerald-700 dark:text-emerald-400' : ''
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            All facilities (overview)
          </Link>
          <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
          {facilities.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-slate-500">Loading facilities…</p>
          ) : (
            facilities.map((f) => (
              <Link
                key={f.facilityId}
                href={`/portal/facilities/${f.facilityId}`}
                role="option"
                aria-selected={selectedId === f.facilityId}
                onClick={() => pickFacility(f.facilityId)}
                className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  selectedId === f.facilityId
                    ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                    : 'font-medium'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{f.name}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}