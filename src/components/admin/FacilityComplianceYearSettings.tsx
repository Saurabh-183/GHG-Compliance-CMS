'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import type { ComplianceType } from '@/types';
import { notify } from '@/lib/notify';
type Facility = { facilityId: string; name: string; clientGroupName?: string };
type Applicability = { facilityId: string; complianceType: ComplianceType; period: string; isApplicable: boolean };
const FRAMEWORKS: { type: ComplianceType; title: string; detail: string }[] = [
  { type: 'RCO', title: 'RCO', detail: 'Renewable Consumption Obligation' },
  { type: 'RPO', title: 'RPO', detail: 'Renewable Purchase Obligation' },
  { type: 'PAT', title: 'PAT', detail: 'Perform, Achieve and Trade' },
  { type: 'CCTS', title: 'CCTS', detail: 'Carbon Credit Trading Scheme' },
];
function getFinancialYears() {
  const now = new Date(); const first = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 7 }, (_, i) => `FY${first - i}-${String(first - i + 1).slice(-2)}`);
}
export default function FacilityComplianceYearSettings() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [records, setRecords] = useState<Applicability[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [period, setPeriod] = useState(getFinancialYears()[0]);
  const [selected, setSelected] = useState<ComplianceType[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const years = useMemo(() => getFinancialYears(), []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, ar] = await Promise.all([fetch('/api/facilities', { cache: 'no-store', credentials: 'include' }), fetch('/api/compliance-applicability', { cache: 'no-store', credentials: 'include' })]);
      const fj = await fr.json(); const aj = await ar.json();
      if (!fr.ok) throw new Error(fj.error || 'Unable to load facilities.');
      if (!ar.ok) throw new Error(aj.error || 'Unable to load compliance settings.');
      const list: Facility[] = fj.data || []; setFacilities(list); setRecords(aj.data || []);
      setFacilityId((current) => current || list[0]?.facilityId || '');
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Unable to load compliance settings.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected(records.filter((r) => r.facilityId === facilityId && r.period.toUpperCase() === period.toUpperCase() && r.isApplicable).map((r) => r.complianceType)); }, [facilityId, period, records]);
  async function save() {
    if (!facilityId) return notify.error('Select a facility first.'); setSaving(true);
    try {
      for (const fw of FRAMEWORKS) {
        const response = await fetch('/api/compliance-applicability', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facilityId, complianceType: fw.type, period, isApplicable: selected.includes(fw.type), authority: 'BEE', ministry: 'Ministry of Power', targetValue: null, targetUnit: '%', workflowStatus: 'NOT_STARTED', complianceOutcome: selected.includes(fw.type) ? 'PENDING_DETERMINATION' : 'NOT_APPLICABLE' }) });
        const json = await response.json(); if (!response.ok) throw new Error(json.error || `Unable to save ${fw.type}.`);
      }
      notify.success(`Compliance settings saved for ${facilityId} — ${period}.`); await load();
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Unable to save compliance settings.'); }
    finally { setSaving(false); }
  }
  const facility = facilities.find((f) => f.facilityId === facilityId);
  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Facility compliance by financial year</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set the compliance frameworks that apply to each facility for each financial year. Consultants can request data only for enabled frameworks in that year.</p></div>
    {loading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div> : <>
      <div className="grid gap-3 md:grid-cols-2"><label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Facility<select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{facilities.map((f) => <option key={f.facilityId} value={f.facilityId}>{f.name} ({f.facilityId})</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Financial year<select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label></div>
      {facility && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{facility.name} · {facility.clientGroupName || 'Organization'} · {period}</div>}
      {!facilities.length && <p className="py-4 text-sm text-slate-500">Create a facility first to configure compliance.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{FRAMEWORKS.map((fw) => { const checked = selected.includes(fw.type); return <button key={fw.type} type="button" disabled={!facilityId} onClick={() => setSelected((current) => checked ? current.filter((x) => x !== fw.type) : [...current, fw.type])} className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${checked ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'}`}><span><span className="block text-sm font-bold text-slate-900 dark:text-white">{fw.title}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{fw.detail}</span></span>{checked ? <CheckCircle2 className="h-5 w-5 text-emerald-600"/> : <span className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-500">Not applicable</span>}</button>; })}</div>
      <div className="mt-4 flex justify-end"><button type="button" onClick={save} disabled={saving || !facilityId} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Save financial-year compliance</button></div>
    </>}
  </section>;
}
