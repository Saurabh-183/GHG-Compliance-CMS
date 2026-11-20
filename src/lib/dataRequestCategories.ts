import type { IRequestField, IRequestDocumentSpec } from '@/types';
import { slugifyFieldKey } from '@/lib/requestFieldUtils';

export const BRSR_SECTIONS = [
  'Section A — General Disclosures',
  'Section B — Management & Process Disclosures',
  'Section C — Principle-wise Performance',
] as const;

export const BRSR_PRINCIPLES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'] as const;

export const DATA_CATEGORIES = [
  'General Disclosures',
  'Energy Consumption',
  'Renewable Energy',
  'Water Consumption',
  'Waste Management',
  'Greenhouse Gas Emissions',
  'Air Emissions',
  'Environmental Compliance',
  'Employee Information',
  'Health and Safety',
  'Human Rights',
  'CSR',
  'Governance',
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

export const SUBMISSION_FORMATS = ['Google Drive link', 'Excel workbook', 'PDF upload via Drive', 'Mixed formats'] as const;

export const FIELD_UNITS = ['kWh', 'INR', 'litres', 'kilolitres', 'metric tonnes', 'tCO₂e', '%', '—'] as const;

export function suggestRequestTitle(category: string, facilityName?: string, period?: string): string {
  const base = category || 'Compliance data';
  const facility = facilityName ? ` — ${facilityName}` : '';
  const fy = period ? ` (${period})` : '';
  return `${base}${facility}${fy}`.trim();
}

export function financialYearOptions(count = 6): string[] {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear - i;
    years.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return years;
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
  brsrSection: (typeof BRSR_SECTIONS)[number];
  brsrPrinciples: string[];
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
    brsrSection: 'Section C — Principle-wise Performance',
    brsrPrinciples: ['P6'],
    purpose:
      "Required to calculate the facility's annual grid electricity consumption and Scope 2 GHG emissions for BRSR and energy compliance.",
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
      { name: 'Electricity Bill', description: 'Official DISCOM bill PDF', required: true, acceptedFileTypes: ['PDF'] },
      { name: 'Monthly Consumption Excel', description: 'Month-wise kWh summary', required: true, acceptedFileTypes: ['XLSX', 'XLS'] },
      { name: 'Renewable Energy Certificate', description: 'If applicable', required: false, acceptedFileTypes: ['PDF'] },
    ],
  },
  {
    id: 'WATER',
    label: 'Water consumption',
    dataCategory: 'Water Consumption',
    brsrSection: 'Section C — Principle-wise Performance',
    brsrPrinciples: ['P6'],
    purpose: 'Supports BRSR water withdrawal, consumption and discharge disclosures.',
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
      { name: 'Water bills / meter records', description: 'Supporting evidence', required: true, acceptedFileTypes: ['PDF', 'XLSX'] },
    ],
  },
  {
    id: 'WASTE',
    label: 'Waste management',
    dataCategory: 'Waste Management',
    brsrSection: 'Section C — Principle-wise Performance',
    brsrPrinciples: ['P6'],
    purpose: 'Documents waste generation, recycling and authorized disposal for BRSR.',
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
      { name: 'Waste manifests', description: 'Authorized transporter/disposal records', required: true, acceptedFileTypes: ['PDF'] },
    ],
  },
  {
    id: 'GHG',
    label: 'GHG emissions',
    dataCategory: 'Greenhouse Gas Emissions',
    brsrSection: 'Section C — Principle-wise Performance',
    brsrPrinciples: ['P6'],
    purpose: 'Scope-wise emissions inventory for climate-related BRSR metrics.',
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
      { name: 'GHG inventory workbook', description: 'Excel or sheet link', required: true, acceptedFileTypes: ['XLSX', 'PDF'] },
    ],
  },
];