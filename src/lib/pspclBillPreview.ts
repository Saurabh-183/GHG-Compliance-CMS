import { calculateReconciliation, formatNumber } from '@/lib/utils';

export interface IPspclBillPreview {
  utilityName: string;
  billTitle: string;
  subDivision: string;
  circle: string;
  billInvoiceNumber: string;
  billingCycle: string;
  consumerAccount: string;
  consumerName: string;
  meterNumber: string;
  contractDemand: string;
  netImportKwh: string;
  netImportUnit: string;
  netImportStatus: string;
  mdiKva: string;
  mdiStatus: string;
  powerFactor: string;
  pfStatus: string;
  declaredEnergyKwh: string;
  billedEnergyKwh: string;
  varianceKwh: string;
  variancePercent: string;
  reconciliationSummary: string;
  reconciliationVariant: 'match' | 'mismatch' | 'neutral';
  sourceMonth: string;
}

export interface ParsedSpreadsheetRow {
  month: string;
  declaredValue: number | null;
  evidenceValue: number | null;
  unit: string;
  tolerance: number | null;
  consumerNumber: string;
  consumerName: string;
  meterNumber: string;
  billingPeriod: string;
  billInvoiceNumber: string;
  subDivision: string;
  circle: string;
  contractDemand: string;
  mdiKva: string;
  mdiStatus: string;
  powerFactor: string;
  pfStatus: string;
  netImportStatus: string;
  utilityName: string;
  billTitle: string;
}

function headerIndex(headers: string[], patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => h.includes(pattern));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(cols: string[], idx: number): string {
  if (idx < 0 || idx >= cols.length) return '';
  return cols[idx]?.trim() ?? '';
}

function parseNum(raw: string): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

function splitDelimitedLine(line: string): string[] {
  const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : ',';
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function fmtNum(n: number | null): string {
  return n === null ? '' : formatNumber(n);
}

/** Parse client consumption Excel/CSV export — values only from file cells. */
export function parseSpreadsheetCsv(csvText: string): ParsedSpreadsheetRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = splitDelimitedLine(lines[0]).map((h) => h.trim().toLowerCase());

  const monthIdx = headerIndex(headers, ['month', 'billing month', 'reporting month', 'period']);
  const decIdx = headerIndex(headers, [
    'declared_value',
    'declared value',
    'declared',
    'client declared',
    'client consumption',
  ]);
  const eviIdx = headerIndex(headers, [
    'evidence_bill',
    'evidence bill',
    'evidence_value',
    'evidence value',
    'evidence',
    'billed',
    'discom',
    'bill value',
  ]);
  const unitIdx = headerIndex(headers, ['unit', 'uom']);
  const tolIdx = headerIndex(headers, ['tolerance', 'tol ']);
  const cNameIdx = headerIndex(headers, ['consumer name', 'plant name', 'facility name', 'company name']);
  const cNoIdx = headerIndex(headers, [
    'consumer no',
    'consumer number',
    'consumer account',
    'consumer_number',
    'account no',
  ]);
  const mNoIdx = headerIndex(headers, ['meter number', 'meter no', 'meter_number', 'meter']);
  const billIdx = headerIndex(headers, ['invoice', 'bill no', 'bill number', 'invoice no']);
  const periodIdx = headerIndex(headers, ['billing period', 'billing cycle', 'cycle']);
  const subIdx = headerIndex(headers, ['sub-division', 'subdivision', 'sub division']);
  const circleIdx = headerIndex(headers, ['circle', 'division']);
  const demandIdx = headerIndex(headers, ['contract demand', 'contract demand kva', 'sanctioned load']);
  const mdiIdx = headerIndex(headers, ['mdi', 'maximum demand', 'max demand', 'mdi kva']);
  const mdiStatIdx = headerIndex(headers, ['mdi status', 'demand status']);
  const pfIdx = headerIndex(headers, ['power factor', 'avg pf', 'pf']);
  const pfStatIdx = headerIndex(headers, ['pf status', 'power factor status']);
  const netStatIdx = headerIndex(headers, ['consumption status', 'meter status', 'energy status']);
  const utilIdx = headerIndex(headers, ['utility', 'discom', 'supplier']);
  const titleIdx = headerIndex(headers, ['document type', 'bill type', 'title']);

  const rows: ParsedSpreadsheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitDelimitedLine(lines[i]).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.every((c) => !c)) continue;

    const unitRaw = cell(cols, unitIdx);

    rows.push({
      month: cell(cols, monthIdx) || `row-${i}`,
      declaredValue: decIdx >= 0 ? parseNum(cell(cols, decIdx)) : null,
      evidenceValue: eviIdx >= 0 ? parseNum(cell(cols, eviIdx)) : null,
      unit: unitRaw,
      tolerance: tolIdx >= 0 ? parseNum(cell(cols, tolIdx)) : null,
      consumerNumber: cell(cols, cNoIdx),
      consumerName: cell(cols, cNameIdx),
      meterNumber: cell(cols, mNoIdx),
      billingPeriod: cell(cols, periodIdx),
      billInvoiceNumber: cell(cols, billIdx),
      subDivision: cell(cols, subIdx),
      circle: cell(cols, circleIdx),
      contractDemand: cell(cols, demandIdx),
      mdiKva: cell(cols, mdiIdx),
      mdiStatus: cell(cols, mdiStatIdx),
      powerFactor: cell(cols, pfIdx),
      pfStatus: cell(cols, pfStatIdx),
      netImportStatus: cell(cols, netStatIdx),
      utilityName: cell(cols, utilIdx),
      billTitle: cell(cols, titleIdx),
    });
  }

  return rows;
}

function pickRow(rows: ParsedSpreadsheetRow[], preferredMonth?: string): ParsedSpreadsheetRow | null {
  if (rows.length === 0) return null;
  if (preferredMonth) {
    const exact = rows.find((r) => r.month === preferredMonth);
    if (exact) return exact;
    const partial = rows.find((r) => r.month.includes(preferredMonth));
    if (partial) return partial;
  }
  return rows[rows.length - 1];
}

const EMPTY_BILL_SHELL: IPspclBillPreview = {
  utilityName: 'Punjab State Power Corporation Limited (PSPCL)',
  billTitle: 'High Tension (HT) Industrial Electricity Bill',
  subDivision: '',
  circle: '',
  billInvoiceNumber: '',
  billingCycle: '',
  consumerAccount: '',
  consumerName: '',
  meterNumber: '',
  contractDemand: '',
  netImportKwh: '',
  netImportUnit: '',
  netImportStatus: '',
  mdiKva: '',
  mdiStatus: '',
  powerFactor: '',
  pfStatus: '',
  declaredEnergyKwh: '',
  billedEnergyKwh: '',
  varianceKwh: '',
  variancePercent: '',
  reconciliationSummary: '',
  reconciliationVariant: 'neutral',
  sourceMonth: '',
};

export function mapRowToPspclBill(
  row: ParsedSpreadsheetRow | null,
  facilityName?: string
): IPspclBillPreview {
  if (!row) {
    return { ...EMPTY_BILL_SHELL, consumerName: facilityName || '' };
  }

  const declared = row.declaredValue;
  const evidence = row.evidenceValue;
  const tolerance = row.tolerance ?? 0;
  const unit = row.unit;

  let reconciliationSummary = '';
  let reconciliationVariant: IPspclBillPreview['reconciliationVariant'] = 'neutral';
  let varianceKwh = '';
  let variancePercent = '';

  if (declared !== null && evidence !== null) {
    const recon = calculateReconciliation(declared, evidence, tolerance);
    varianceKwh = recon.variance === 0 ? '' : fmtNum(recon.variance);
    variancePercent = recon.variancePercentage === 0 ? '' : `${recon.variancePercentage}%`;

    if (recon.result === 'MATCHED') {
      reconciliationVariant = 'match';
      reconciliationSummary = `Reconciliation Match Confirmed: Declared energy (${fmtNum(declared)}${unit ? ` ${unit}` : ''}) matches PSPCL bill (${fmtNum(evidence)}${unit ? ` ${unit}` : ''}).`;
    } else if (recon.result === 'MISMATCH') {
      reconciliationVariant = 'mismatch';
      reconciliationSummary = `Reconciliation Variance: Declared ${fmtNum(declared)}${unit ? ` ${unit}` : ''} vs bill ${fmtNum(evidence)}${unit ? ` ${unit}` : ''} — Δ ${fmtNum(recon.variance)}${unit ? ` ${unit}` : ''} (${recon.variancePercentage}%).`;
    }
  }

  return {
    utilityName: row.utilityName || EMPTY_BILL_SHELL.utilityName,
    billTitle: row.billTitle || EMPTY_BILL_SHELL.billTitle,
    subDivision: row.subDivision,
    circle: row.circle,
    billInvoiceNumber: row.billInvoiceNumber,
    billingCycle: row.billingPeriod,
    consumerAccount: row.consumerNumber,
    consumerName: row.consumerName || facilityName || '',
    meterNumber: row.meterNumber,
    contractDemand: row.contractDemand,
    netImportKwh: fmtNum(evidence),
    netImportUnit: unit,
    netImportStatus: row.netImportStatus,
    mdiKva: row.mdiKva,
    mdiStatus: row.mdiStatus,
    powerFactor: row.powerFactor,
    pfStatus: row.pfStatus,
    declaredEnergyKwh: fmtNum(declared),
    billedEnergyKwh: fmtNum(evidence),
    varianceKwh,
    variancePercent,
    reconciliationSummary,
    reconciliationVariant,
    sourceMonth: row.month.startsWith('row-') ? '' : row.month,
  };
}

export function buildPspclBillFromCsv(
  csvText: string,
  options?: { preferredMonth?: string; facilityName?: string }
): { bill: IPspclBillPreview; rows: ParsedSpreadsheetRow[] } {
  const rows = parseSpreadsheetCsv(csvText);
  const row = pickRow(rows, options?.preferredMonth);
  return {
    bill: mapRowToPspclBill(row, options?.facilityName),
    rows,
  };
}