import type { IRequestField, IRequestDocumentSpec } from '@/types';
import { slugifyFieldKey } from '@/lib/requestFieldUtils';
import { MASTER_REQUIREMENT_CATEGORIES } from '@/lib/dataRequirementMaster';
import { getRollingFinancialYears } from '@/lib/financialYears';

export const DATA_CATEGORIES = [
  ...Object.values(MASTER_REQUIREMENT_CATEGORIES),
  'Energy Consumption',
  'Water Consumption',
  'Waste Management',
  'Greenhouse Gas Emissions',
  'Other Compliance Data',
] as const;

export type DataCategoryLabel = (typeof DATA_CATEGORIES)[number];

export const REPORTING_FREQUENCIES = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-yearly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

export type ReportingFrequency = (typeof REPORTING_FREQUENCIES)[number]['value'];

export { DEFAULT_SUBMISSION_FORMAT, DEFAULT_ACCEPTED_FILE_TYPES } from '@/lib/submissionPolicy';

export const SUBMISSION_FORMATS = ['Google Drive link'] as const;

export const FIELD_UNITS = ['kWh', 'INR', 'litres', 'kilolitres', 'metric tonnes', 'tCO₂e', '%', '—'] as const;

export function suggestRequestTitle(category: string, facilityName?: string, period?: string): string {
  const base = category || 'Compliance data';
  const facility = facilityName ? ` — ${facilityName}` : '';
  const fy = period ? ` (${period})` : '';
  return `${base}${facility}${fy}`.trim();
}

export function financialYearOptions(): string[] {
  // Keep request forms aligned with the three-year admin and compliance views.
  return getRollingFinancialYears().map((period) => period.replace(/^FY/, ''));
}

export function generateMonthRange(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) return [];
  const months: string[] = [];
  const cur = new Date(`${start}-01T00:00:00Z`);
  const last = new Date(`${end}-01T00:00:00Z`);
  while (cur <= last) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return months;
}

export type ConsultantRequestTemplateId = 'ELECTRICITY' | 'WATER' | 'WASTE' | 'GHG';

export interface ConsultantRequestTemplate {
  id: ConsultantRequestTemplateId;
  label: string;
  dataCategory: DataCategoryLabel;
  purpose: string;
  instructions: string;
  fields: IRequestField[];
  documents: IRequestDocumentSpec[];
}

const f = (
  label: string,
  type: IRequestField['type'],
  required: boolean,
  extra?: Partial<IRequestField>
): IRequestField => ({
  key: slugifyFieldKey(label),
  label,
  type,
  required,
  ...extra,
});

export const CONSULTANT_REQUEST_TEMPLATES: ConsultantRequestTemplate[] = [
  {
    id: 'ELECTRICITY',
    label: 'Electricity consumption',
    dataCategory: 'Energy Consumption',
    purpose:
      "Required to calculate the facility's annual grid electricity consumption and Scope 2 GHG emissions for energy compliance (PAT, RCO).",
    instructions:
      'Upload electricity bills for each reporting month. Enter consumption in kWh. Ensure invoice number and billing cycle are visible. Share Excel or Google Drive links with view access.',
    fields: [
      f('Electricity Provider', 'TEXT', true),
      f('Consumer Account Number', 'TEXT', true),
      f('Consumer Name', 'TEXT', true),
      f('Meter Number', 'TEXT', true),
      f('Bill Invoice Number', 'TEXT', true),
      f('Billing Cycle', 'TEXT', true),
      f('Contract Demand', 'TEXT', true),
      f('Billed Active Energy (kWh)', 'NUMBER', true, { unit: 'kWh' }),
      f('Total Bill Amount (INR)', 'NUMBER', true, { unit: 'INR' }),
      f('Renewable Electricity Consumption', 'NUMBER', false, { unit: 'kWh' }),
    ],
    documents: [
      { name: 'Monthly Consumption Excel', description: 'Month-wise kWh summary (.xlsx on Drive)', required: true, acceptedFileTypes: ['XLSX'] },
      { name: 'Electricity Bill Workbook', description: 'Bill details in .xlsx on Drive', required: true, acceptedFileTypes: ['XLSX'] },
      { name: 'Renewable Energy Certificate', description: 'If applicable — .xlsx log on Drive', required: false, acceptedFileTypes: ['XLSX'] },
    ],
  },
  {
    id: 'WATER',
    label: 'Water consumption',
    dataCategory: 'Water Consumption',
    purpose: 'Supports statutory water withdrawal, consumption and discharge tracking.',
    instructions: 'Provide meter readings or utility bills for the reporting period. Enter values in kilolitres where applicable.',
    fields: [
      f('Water Source', 'SELECT', true, { options: ['Groundwater', 'Surface water', 'Municipal', 'Third party', 'Mixed'] }),
      f('Groundwater Withdrawal', 'NUMBER', true, { unit: 'kilolitres' }),
      f('Surface Water Withdrawal', 'NUMBER', false, { unit: 'kilolitres' }),
      f('Third-Party Water', 'NUMBER', false, { unit: 'kilolitres' }),
      f('Total Water Withdrawal', 'NUMBER', true, { unit: 'kilolitres' }),
      f('Total Water Consumption', 'NUMBER', true, { unit: 'kilolitres' }),
      f('Wastewater Discharge', 'NUMBER', true, { unit: 'kilolitres' }),
      f('Water Recycled and Reused', 'NUMBER', false, { unit: 'kilolitres' }),
    ],
    documents: [
      { name: 'Water bills / meter records', description: 'Supporting .xlsx on Drive', required: true, acceptedFileTypes: ['XLSX'] },
    ],
  },
  {
    id: 'WASTE',
    label: 'Waste management',
    dataCategory: 'Waste Management',
    purpose: 'Documents waste generation, recycling and authorized disposal for environmental compliance.',
    instructions: 'Share manifests, recycler certificates and month-wise waste logs via Google Drive.',
    fields: [
      f('Waste Category', 'SELECT', true, { options: ['Plastic', 'Hazardous', 'Non-hazardous', 'E-waste', 'Mixed'] }),
      f('Total Waste Generated', 'NUMBER', true, { unit: 'metric tonnes' }),
      f('Waste Recycled', 'NUMBER', false, { unit: 'metric tonnes' }),
      f('Waste Disposed', 'NUMBER', true, { unit: 'metric tonnes' }),
      f('Hazardous Waste Quantity', 'NUMBER', false, { unit: 'metric tonnes' }),
      f('Non-Hazardous Waste Quantity', 'NUMBER', false, { unit: 'metric tonnes' }),
      f('Disposal Vendor', 'TEXT', false),
    ],
    documents: [
      { name: 'Waste manifests', description: 'Authorized records — .xlsx on Drive', required: true, acceptedFileTypes: ['XLSX'] },
    ],
  },
  {
    id: 'GHG',
    label: 'GHG emissions',
    dataCategory: 'Greenhouse Gas Emissions',
    purpose: 'Scope-wise emissions inventory for climate and energy compliance.',
    instructions: 'Upload calculation workbook and emission factor references. State methodology clearly.',
    fields: [
      f('Emission Scope', 'SELECT', true, { options: ['Scope 1', 'Scope 2', 'Scope 3'] }),
      f('Emission Source', 'TEXT', true),
      f('Fuel / Energy Consumption', 'NUMBER', false),
      f('Quantity', 'NUMBER', true),
      f('Unit', 'TEXT', true),
      f('Emission Factor', 'DECIMAL', false),
      f('Total Emissions', 'NUMBER', true, { unit: 'tCO₂e' }),
      f('Calculation Methodology', 'LONG_TEXT', true),
    ],
    documents: [
      { name: 'GHG inventory workbook', description: '.xlsx on Google Drive', required: true, acceptedFileTypes: ['XLSX'] },
    ],
  },
];