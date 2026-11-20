import type { IRequestField, RequestFieldType } from '@/types';

export type BrsrDataCategory =
  | 'GENERAL_DISCLOSURE'
  | 'ENERGY'
  | 'WATER'
  | 'GHG_EMISSIONS'
  | 'WASTE'
  | 'EMPLOYEE_SOCIAL'
  | 'GOVERNANCE'
  | 'OTHER';

export interface BrsrRequestTemplate {
  id: string;
  title: string;
  dataCategory: BrsrDataCategory;
  brsrSection: string;
  brsrPrinciple?: string;
  description: string;
  purpose: string;
  requiredFields: IRequestField[];
  requiredDocuments: string[];
  submissionInstructions: string;
  monthlyFrequency?: boolean;
  reportingMonthsHint?: string;
  suggestedCompliances: Array<'RCO' | 'PAT' | 'CCTS' | 'CEA'>;
}

const field = (
  key: string,
  label: string,
  type: RequestFieldType,
  required: boolean,
  extra?: Partial<IRequestField>
): IRequestField => ({ key, label, type, required, ...extra });

export const BRSR_REQUEST_TEMPLATES: BrsrRequestTemplate[] = [
  {
    id: 'general-company-info',
    title: 'General Disclosures — Company & Facility Profile',
    dataCategory: 'GENERAL_DISCLOSURE',
    brsrSection: 'Section A — General Disclosures',
    description: 'Corporate identity, facility footprint, NIC codes, reporting boundary and organizational structure for BRSR.',
    purpose: 'Establish the legal and operational boundary for sustainability disclosures.',
    requiredFields: [
      field('legal_name', 'Registered company name', 'TEXT', true),
      field('cin', 'CIN / registration number', 'TEXT', true),
      field('reporting_boundary', 'Reporting boundary (consolidated / entity)', 'SELECT', true, {
        options: ['Consolidated', 'Entity only', 'Facility level'],
      }),
      field('nic_codes', 'NIC codes (comma-separated)', 'TEXT', true),
      field('employees_total', 'Total employees (reporting year)', 'NUMBER', true),
      field('workers_total', 'Total workers (reporting year)', 'NUMBER', false),
    ],
    requiredDocuments: ['Organization chart', 'Facility list with locations'],
    submissionInstructions: 'Upload an Excel or PDF with company and facility details. Use a shared Google Drive link with view access.',
    suggestedCompliances: ['RCO'],
  },
  {
    id: 'energy-grid-electricity',
    title: 'Energy — Monthly Grid Electricity Consumption',
    dataCategory: 'ENERGY',
    brsrSection: 'Principle 6 — Environment',
    brsrPrinciple: 'P6',
    description: 'Monthly grid electricity consumption, renewable share, and supporting DISCOM bills for the reporting year.',
    purpose: 'Scope 2 GHG inventory, BRSR energy intensity, and PAT / energy compliance reconciliation.',
    requiredFields: [
      field('provider', 'Electricity provider / DISCOM', 'TEXT', true),
      field('consumer_account', 'Consumer account number', 'TEXT', true),
      field('annual_kwh', 'Total billed active energy (kWh) — annual', 'NUMBER', true, { unit: 'kWh' }),
      field('renewable_kwh', 'Renewable / green power (kWh)', 'NUMBER', false, { unit: 'kWh' }),
      field('energy_spend', 'Total electricity expenditure (₹)', 'NUMBER', false),
    ],
    requiredDocuments: ['Monthly electricity bills', 'Consumption register (Excel)'],
    submissionInstructions: 'Submit one folder per facility with monthly bills. Complete connection details in the portal when prompted.',
    monthlyFrequency: true,
    reportingMonthsHint: 'All FY months, e.g. 2025-04 through 2026-03',
    suggestedCompliances: ['PAT', 'RCO'],
  },
  {
    id: 'energy-diesel-fuels',
    title: 'Energy — Diesel & Other Fuel Consumption',
    dataCategory: 'ENERGY',
    brsrSection: 'Principle 6 — Environment',
    brsrPrinciple: 'P6',
    description: 'Stationary combustion fuels used on-site (diesel generators, furnaces, boilers).',
    purpose: 'Scope 1 emissions and BRSR energy disclosure.',
    requiredFields: [
      field('diesel_litres', 'Diesel consumption (litres)', 'NUMBER', true, { unit: 'L' }),
      field('other_fuels', 'Other fuels (description)', 'TEXT', false),
      field('other_fuel_quantity', 'Other fuel quantity', 'TEXT', false),
    ],
    requiredDocuments: ['Fuel purchase invoices', 'Monthly fuel log'],
    submissionInstructions: 'Provide purchase records and internal consumption logs via Google Drive.',
    suggestedCompliances: ['PAT', 'RCO'],
  },
  {
    id: 'water-consumption',
    title: 'Water — Withdrawal, Consumption & Discharge',
    dataCategory: 'WATER',
    brsrSection: 'Principle 6 — Environment',
    brsrPrinciple: 'P6',
    description: 'Groundwater, surface water, third-party supply, consumption, discharge and recycling.',
    purpose: 'BRSR water stewardship indicators and environmental compliance.',
    requiredFields: [
      field('groundwater_kl', 'Groundwater withdrawal (kL)', 'NUMBER', true, { unit: 'kL' }),
      field('surface_water_kl', 'Surface water withdrawal (kL)', 'NUMBER', false, { unit: 'kL' }),
      field('third_party_kl', 'Third-party water (kL)', 'NUMBER', false, { unit: 'kL' }),
      field('consumption_kl', 'Total water consumption (kL)', 'NUMBER', true, { unit: 'kL' }),
      field('discharge_kl', 'Water discharged (kL)', 'NUMBER', true, { unit: 'kL' }),
      field('recycled_kl', 'Water recycled / reused (kL)', 'NUMBER', false, { unit: 'kL' }),
    ],
    requiredDocuments: ['Water bills', 'Meter readings', 'Treatment plant records'],
    submissionInstructions: 'Include monthly meter readings where available. Highlight missing months in comments.',
    monthlyFrequency: true,
    suggestedCompliances: ['RCO'],
  },
  {
    id: 'ghg-emissions',
    title: 'Greenhouse Gas Emissions — Scope 1, 2 & 3',
    dataCategory: 'GHG_EMISSIONS',
    brsrSection: 'Principle 6 — Environment',
    brsrPrinciple: 'P6',
    description: 'Scope-wise emissions, methodology, emission factors and intensity metrics.',
    purpose: 'Climate-related BRSR metrics and statutory GHG reporting.',
    requiredFields: [
      field('scope1_tco2e', 'Scope 1 emissions (tCO₂e)', 'NUMBER', true),
      field('scope2_tco2e', 'Scope 2 emissions (tCO₂e)', 'NUMBER', true),
      field('scope3_tco2e', 'Scope 3 emissions (tCO₂e)', 'NUMBER', false),
      field('methodology', 'Calculation methodology', 'TEXT', true),
      field('intensity', 'Emissions intensity metric', 'TEXT', false),
      field('assurance', 'External assurance (Y/N + provider)', 'TEXT', false),
    ],
    requiredDocuments: ['GHG inventory workbook', 'Emission factor references'],
    submissionInstructions: 'Upload the calculation workbook used for the reporting year.',
    suggestedCompliances: ['RCO', 'CCTS'],
  },
  {
    id: 'waste-management',
    title: 'Waste Management — Generation, Recycling & Disposal',
    dataCategory: 'WASTE',
    brsrSection: 'Principle 6 — Environment',
    brsrPrinciple: 'P6',
    description: 'Plastic, e-waste, hazardous, biomedical, C&D and other waste streams.',
    purpose: 'BRSR waste disclosures and environmental authorizations.',
    requiredFields: [
      field('plastic_waste_t', 'Plastic waste (tonnes)', 'NUMBER', true),
      field('hazardous_waste_t', 'Hazardous waste (tonnes)', 'NUMBER', true),
      field('ewaste_t', 'E-waste (tonnes)', 'NUMBER', false),
      field('recycled_t', 'Waste recycled (tonnes)', 'NUMBER', false),
      field('disposed_t', 'Waste disposed (tonnes)', 'NUMBER', true),
      field('disposal_vendor', 'Authorized disposal vendor(s)', 'TEXT', false),
    ],
    requiredDocuments: ['Waste manifests', 'Recycler / TSDF certificates'],
    submissionInstructions: 'Provide month-wise logs where mandated by state rules.',
    suggestedCompliances: ['RCO'],
  },
  {
    id: 'employee-social',
    title: 'Employees & Workers — Diversity, Safety & Grievances',
    dataCategory: 'EMPLOYEE_SOCIAL',
    brsrSection: 'Section B — Management & Process',
    brsrPrinciple: 'P3',
    description: 'Headcount by category, diversity, training, safety incidents and grievance mechanisms.',
    purpose: 'Social BRSR principles and POSH / labour compliance evidence.',
    requiredFields: [
      field('perm_employees', 'Permanent employees', 'NUMBER', true),
      field('temp_employees', 'Temporary employees', 'NUMBER', false),
      field('contract_workers', 'Contract workers', 'NUMBER', false),
      field('female_pct', 'Female employees (%)', 'NUMBER', false),
      field('injuries', 'Recordable injuries (count)', 'NUMBER', true),
      field('fatalities', 'Fatalities (count)', 'NUMBER', true),
      field('grievances', 'Employee grievances received', 'NUMBER', false),
    ],
    requiredDocuments: ['HR headcount report', 'Safety records', 'POSH disclosure if applicable'],
    submissionInstructions: 'Use the company HR template for the reporting year.',
    suggestedCompliances: ['RCO'],
  },
  {
    id: 'governance-ethics',
    title: 'Governance — Ethics, CSR & Stakeholder Engagement',
    dataCategory: 'GOVERNANCE',
    brsrSection: 'Principle 1–9',
    description: 'Ethics, anti-corruption, human rights, stakeholder engagement, CSR and consumer protection disclosures.',
    purpose: 'Leadership and governance BRSR principle coverage.',
    requiredFields: [
      field('anti_corruption_training', 'Anti-corruption training coverage (%)', 'NUMBER', false),
      field('csr_spend', 'CSR spend (₹ lakh)', 'NUMBER', false),
      field('stakeholder_forums', 'Stakeholder engagement forums held', 'NUMBER', false),
      field('consumer_complaints', 'Consumer complaints received', 'NUMBER', false),
    ],
    requiredDocuments: ['Board / policy references', 'CSR annual report excerpt'],
    submissionInstructions: 'Attach policy documents or published BRSR draft sections as applicable.',
    suggestedCompliances: ['RCO'],
  },
];

export function getTemplateById(templateId: string): BrsrRequestTemplate | undefined {
  return BRSR_REQUEST_TEMPLATES.find((t) => t.id === templateId);
}

export const BRSR_CATEGORY_LABELS: Record<BrsrDataCategory, string> = {
  GENERAL_DISCLOSURE: 'General Disclosures',
  ENERGY: 'Energy Consumption',
  WATER: 'Water Consumption',
  GHG_EMISSIONS: 'GHG Emissions',
  WASTE: 'Waste Management',
  EMPLOYEE_SOCIAL: 'Employee & Social',
  GOVERNANCE: 'Governance & Other BRSR',
  OTHER: 'Other',
};