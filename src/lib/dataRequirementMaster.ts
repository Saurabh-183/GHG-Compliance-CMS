import type { ComplianceType, IRequestDocumentSpec, IRequestField, ReportingFrequency } from '@/types';

/** Canonical checklist categories from the All-Clients Data Checklist. */
export type MasterRequirementCategory =
  | 'ENVIRONMENTAL_APPROVALS'
  | 'FUEL_ANALYSIS'
  | 'PRODUCTION'
  | 'BOILER_STEAM'
  | 'TURBINE'
  | 'ELECTRICITY_POWER'
  | 'FUEL_STOCK'
  | 'EQUIPMENT_MONITORING';

export type ChecklistApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'NOT_REQUIRED'
  | 'NEEDS_VERIFICATION'
  | 'UNSELECTED';

export type MasterInputType =
  | 'FILE_UPLOAD'
  | 'DRIVE_LINK'
  | 'STRUCTURED_FORM'
  | 'MONTHLY_TABLE'
  | 'MIXED';

export interface IMasterRequirementRow {
  requirementId: string;
  itemKey: string;
  name: string;
  sourceColumnLabel: string;
  category: MasterRequirementCategory;
  description: string;
  requiredEvidence: string;
  inputType: MasterInputType;
  reportingFrequency: ReportingFrequency;
  unit?: string;
  mandatory: boolean;
  defaultCompliances: ComplianceType[];
  specialInstructions?: string;
  structuredFields?: IRequestField[];
  documentSpecs?: IRequestDocumentSpec[];
}

export const MASTER_REQUIREMENT_CATEGORIES: Record<MasterRequirementCategory, string> = {
  ENVIRONMENTAL_APPROVALS: 'Environmental Approvals',
  FUEL_ANALYSIS: 'Fuel Analysis',
  PRODUCTION: 'Production Data',
  BOILER_STEAM: 'Boiler and Steam Data',
  TURBINE: 'Turbine Data',
  ELECTRICITY_POWER: 'Electricity and Power Data',
  FUEL_STOCK: 'Fuel and Stock Data',
  EQUIPMENT_MONITORING: 'Equipment and Monitoring',
};

export const CHECKLIST_MASTER_VERSION = '2025-all-clients-v1';

export const DATA_REQUIREMENT_MASTER: IMasterRequirementRow[] = [
  {
    requirementId: 'REQ-001',
    itemKey: 'CTO_CTE_CCA',
    name: 'CTO / CTE / CCA',
    sourceColumnLabel: 'CTO / CTE / CCA',
    category: 'ENVIRONMENTAL_APPROVALS',
    description: 'Valid consent to operate / establish and compliance approval documents for the facility.',
    requiredEvidence: 'Approved CTO/CTE/CCA copies or renewal letters',
    inputType: 'FILE_UPLOAD',
    reportingFrequency: 'ANNUAL',
    mandatory: true,
    defaultCompliances: ['RCO', 'CEA'],
    documentSpecs: [{ name: 'Environmental approval certificate', required: true, acceptedFileTypes: ['XLSX'] }],
  },
  {
    requirementId: 'REQ-002',
    itemKey: 'GCV_EXT_FOSSIL',
    name: 'External GCV Certificate – Fossil Fuels',
    sourceColumnLabel: 'GCV Certificate — External Fossil Fuels',
    category: 'FUEL_ANALYSIS',
    description: 'Third-party gross calorific value certificates for fossil fuels consumed on site.',
    requiredEvidence: 'External laboratory GCV certificate per fuel type',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'ANNUAL',
    unit: 'kcal/kg',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    structuredFields: [
      { key: 'fuelType', label: 'Fuel type', type: 'TEXT', required: true },
      { key: 'fossilNonFossil', label: 'Fossil / Non-fossil', type: 'SELECT', required: true, options: ['Fossil', 'Non-fossil'] },
      { key: 'fuelName', label: 'Fuel name', type: 'TEXT', required: true },
      { key: 'gcvValue', label: 'GCV value', type: 'DECIMAL', required: true, unit: 'kcal/kg' },
      { key: 'reportingPeriod', label: 'Reporting period', type: 'TEXT', required: true },
    ],
    documentSpecs: [{ name: 'GCV certificate (PDF)', required: true, acceptedFileTypes: ['XLSX'] }],
  },
  {
    requirementId: 'REQ-003',
    itemKey: 'GCV_EXT_NON_FOSSIL',
    name: 'External GCV Certificate – Non-Fossil Fuels',
    sourceColumnLabel: 'GCV Certificate — External Non-Fossil Fuels',
    category: 'FUEL_ANALYSIS',
    description: 'Third-party GCV certificates for non-fossil fuels (e.g. biomass).',
    requiredEvidence: 'External GCV certificate',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'ANNUAL',
    unit: 'kcal/kg',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    structuredFields: [
      { key: 'fuelName', label: 'Fuel name', type: 'TEXT', required: true },
      { key: 'gcvValue', label: 'GCV value', type: 'DECIMAL', required: true, unit: 'kcal/kg' },
      { key: 'reportingPeriod', label: 'Reporting period', type: 'TEXT', required: true },
    ],
    documentSpecs: [{ name: 'GCV certificate', required: true }],
  },
  {
    requirementId: 'REQ-004',
    itemKey: 'GCV_INT_BOMB',
    name: 'Internal GCV Bomb Calorimeter Reading',
    sourceColumnLabel: 'GCV Internal — Bomb Calorimeter Reading (NCV)',
    category: 'FUEL_ANALYSIS',
    description: 'Internal bomb calorimeter readings where external GCV is not used.',
    requiredEvidence: 'Internal lab log / NCV worksheet',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    unit: 'kcal/kg',
    mandatory: false,
    defaultCompliances: ['PAT'],
    specialInstructions: 'GCV not needed when checklist marks explicit exemption.',
    structuredFields: [
      { key: 'fuelName', label: 'Fuel name', type: 'TEXT', required: true },
      { key: 'ncvValue', label: 'NCV value', type: 'DECIMAL', required: true, unit: 'kcal/kg' },
      { key: 'testDate', label: 'Test date', type: 'DATE', required: true },
    ],
  },
  {
    requirementId: 'REQ-005',
    itemKey: 'ULTIMATE_ANALYSIS',
    name: 'Ultimate Analysis – Carbon Content / NCV – Fossil Fuels',
    sourceColumnLabel: 'Ultimate Analysis (Carbon Content) — Fossil Fuels',
    category: 'FUEL_ANALYSIS',
    description: 'Ultimate analysis including carbon content for fossil fuels.',
    requiredEvidence: 'Lab analysis report',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'ANNUAL',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    structuredFields: [
      { key: 'carbonContent', label: 'Carbon content', type: 'DECIMAL', required: true, unit: '%' },
      { key: 'ncvValue', label: 'NCV', type: 'DECIMAL', required: false, unit: 'kcal/kg' },
    ],
    documentSpecs: [{ name: 'Ultimate analysis report', required: true }],
  },
  {
    requirementId: 'REQ-006',
    itemKey: 'PROXIMATE_ANALYSIS',
    name: 'Proximate Analysis – Moisture / Fixed Carbon – Fossil Fuels',
    sourceColumnLabel: 'Proximate Analysis (Moisture, Fixed Carbon)',
    category: 'FUEL_ANALYSIS',
    description: 'Proximate analysis — moisture and fixed carbon.',
    requiredEvidence: 'Proximate analysis report',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'ANNUAL',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'moisture', label: 'Moisture content', type: 'DECIMAL', required: true, unit: '%' },
      { key: 'fixedCarbon', label: 'Fixed carbon', type: 'DECIMAL', required: true, unit: '%' },
    ],
    documentSpecs: [{ name: 'Proximate analysis report', required: true }],
  },
  {
    requirementId: 'REQ-007',
    itemKey: 'PROD_MONTH_ALL',
    name: 'Month-wise Production – All Products',
    sourceColumnLabel: 'Production — Month-wise Data (All Products)',
    category: 'PRODUCTION',
    description: 'Total production quantities for all finished products, month-wise.',
    requiredEvidence: 'Production register or MIS export',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO', 'CCTS'],
    structuredFields: [
      { key: 'productName', label: 'Product name', type: 'TEXT', required: true },
      { key: 'productionQty', label: 'Production quantity', type: 'DECIMAL', required: true },
      { key: 'unit', label: 'Unit', type: 'TEXT', required: true },
      { key: 'month', label: 'Month', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-008',
    itemKey: 'PROD_MONTH_MACHINE',
    name: 'Month-wise Production – Per Machine',
    sourceColumnLabel: 'Production — Month-wise Per Machine Data',
    category: 'PRODUCTION',
    description: 'Machine-level production data for each reporting month.',
    requiredEvidence: 'Machine-wise production log',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'machine', label: 'Machine', type: 'TEXT', required: true },
      { key: 'productName', label: 'Product name', type: 'TEXT', required: true },
      { key: 'productionQty', label: 'Production quantity', type: 'DECIMAL', required: true },
      { key: 'month', label: 'Month', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-009',
    itemKey: 'PROCESS_FLOW',
    name: 'Process Flow Diagram',
    sourceColumnLabel: 'Process Flow Diagram',
    category: 'PRODUCTION',
    description: 'Updated process flow diagram for the reporting period.',
    requiredEvidence: 'PFD drawing (PDF)',
    inputType: 'FILE_UPLOAD',
    reportingFrequency: 'ONE_TIME',
    mandatory: false,
    defaultCompliances: ['RCO'],
    documentSpecs: [{ name: 'Process flow diagram', required: true, acceptedFileTypes: ['XLSX'] }],
  },
  {
    requirementId: 'REQ-010',
    itemKey: 'INTERMEDIATE_PROD',
    name: 'Intermediate Product Production Data',
    sourceColumnLabel: 'Intermediate Product Production Data',
    category: 'PRODUCTION',
    description: 'Production quantities for intermediate products.',
    requiredEvidence: 'Intermediate production report',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'intermediateProduct', label: 'Intermediate product', type: 'TEXT', required: true },
      { key: 'quantity', label: 'Quantity', type: 'DECIMAL', required: true },
      { key: 'unit', label: 'Unit', type: 'TEXT', required: true },
      { key: 'month', label: 'Month', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-011',
    itemKey: 'INTERMEDIATE_SALE',
    name: 'Intermediate Product Sale Data',
    sourceColumnLabel: 'Intermediate Product Sale Data',
    category: 'PRODUCTION',
    description: 'Sales of intermediate products.',
    requiredEvidence: 'Sales register / dispatch records',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'intermediateProduct', label: 'Intermediate product', type: 'TEXT', required: true },
      { key: 'saleQty', label: 'Sale quantity', type: 'DECIMAL', required: true },
      { key: 'month', label: 'Month', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-012',
    itemKey: 'BOILER_STEAM_LOG',
    name: 'Boiler Steam Generation Logbooks',
    sourceColumnLabel: 'Boiler Steam Generation Log Books',
    category: 'BOILER_STEAM',
    description: 'Daily / shift boiler steam generation logbooks.',
    requiredEvidence: 'Signed logbook scans or sheets',
    inputType: 'MIXED',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    structuredFields: [
      { key: 'boilerId', label: 'Boiler ID', type: 'TEXT', required: true },
      { key: 'steamGeneration', label: 'Steam generation', type: 'DECIMAL', required: true },
      { key: 'reportingPeriod', label: 'Reporting period', type: 'TEXT', required: true },
    ],
    documentSpecs: [{ name: 'Boiler logbook', required: true }],
  },
  {
    requirementId: 'REQ-013',
    itemKey: 'BOILER_HOURS',
    name: 'Boiler Running Hours / Detention Hours',
    sourceColumnLabel: 'Boiler Running Hours / Detention Hours',
    category: 'BOILER_STEAM',
    description: 'Operating and detention hours for each boiler.',
    requiredEvidence: 'Boiler hours register',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'boilerId', label: 'Boiler ID', type: 'TEXT', required: true },
      { key: 'runningHours', label: 'Running hours', type: 'DECIMAL', required: true },
      { key: 'detentionHours', label: 'Detention hours', type: 'DECIMAL', required: false },
    ],
  },
  {
    requirementId: 'REQ-014',
    itemKey: 'BOILER_STEAM_PARAMS',
    name: 'Boiler SH Steam Pressure / Temperature / Enthalpy / Efficiency',
    sourceColumnLabel: 'Boiler SH Steam Pressure / Temperature / Enthalpy / Design & Operating Efficiency',
    category: 'BOILER_STEAM',
    description: 'Superheated steam parameters and design vs operating efficiency.',
    requiredEvidence: 'DCS export or manual log',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'pressure', label: 'Pressure', type: 'DECIMAL', required: true },
      { key: 'temperature', label: 'Temperature', type: 'DECIMAL', required: true },
      { key: 'enthalpy', label: 'Enthalpy', type: 'DECIMAL', required: false },
      { key: 'designEfficiency', label: 'Design efficiency', type: 'DECIMAL', required: false, unit: '%' },
      { key: 'operatingEfficiency', label: 'Operating efficiency', type: 'DECIMAL', required: false, unit: '%' },
    ],
  },
  {
    requirementId: 'REQ-015',
    itemKey: 'BOILER_FUEL',
    name: 'Per Boiler Fuel Consumption Data',
    sourceColumnLabel: 'Per Boiler Fuel Consumption Data',
    category: 'BOILER_STEAM',
    description: 'Fuel consumption allocated to each boiler.',
    requiredEvidence: 'Fuel issue register',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    structuredFields: [
      { key: 'boilerId', label: 'Boiler ID', type: 'TEXT', required: true },
      { key: 'fuelConsumption', label: 'Fuel consumption', type: 'DECIMAL', required: true },
      { key: 'unit', label: 'Unit', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-016',
    itemKey: 'STEAM_CONSUMPTION',
    name: 'Steam Consumption Across Units',
    sourceColumnLabel: 'Steam Consumption Across Units',
    category: 'BOILER_STEAM',
    description: 'Steam consumption by plant unit or department.',
    requiredEvidence: 'Steam meter readings / allocation sheet',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'unitName', label: 'Unit / department', type: 'TEXT', required: true },
      { key: 'steamConsumption', label: 'Steam consumption', type: 'DECIMAL', required: true },
    ],
  },
  {
    requirementId: 'REQ-017',
    itemKey: 'TURBINE_GEN_LOG',
    name: 'Turbine Generation Logbooks',
    sourceColumnLabel: 'Turbine Generation Log Books',
    category: 'TURBINE',
    description: 'Turbine generation logbooks.',
    requiredEvidence: 'Logbook PDF or Drive link',
    inputType: 'MIXED',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    documentSpecs: [{ name: 'Turbine logbook', required: true }],
  },
  {
    requirementId: 'REQ-018',
    itemKey: 'TURBINE_EXTRACTION',
    name: 'Turbine Extraction Point Steam Data',
    sourceColumnLabel: 'Turbine Extraction Point Steam Data',
    category: 'TURBINE',
    description: 'Steam flow and conditions at extraction points.',
    requiredEvidence: 'DCS / field readings',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'extractionPoint', label: 'Extraction point', type: 'TEXT', required: true },
      { key: 'steamFlow', label: 'Steam flow', type: 'DECIMAL', required: true },
    ],
  },
  {
    requirementId: 'REQ-019',
    itemKey: 'TURBINE_POWER',
    name: 'Turbine Power Generation Data',
    sourceColumnLabel: 'Turbine Power Generation Data',
    category: 'TURBINE',
    description: 'Gross and net power generation from turbines.',
    requiredEvidence: 'Generation meter data',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'turbineId', label: 'Turbine ID', type: 'TEXT', required: true },
      { key: 'powerGenerated', label: 'Power generated', type: 'DECIMAL', required: true, unit: 'kWh' },
    ],
  },
  {
    requirementId: 'REQ-020',
    itemKey: 'AUX_POWER',
    name: 'Auxiliary Power Consumption',
    sourceColumnLabel: 'Auxiliary Power Generation',
    category: 'TURBINE',
    description: 'Auxiliary power consumption in turbine island / CPP.',
    requiredEvidence: 'Auxiliary meter readings',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'auxPower', label: 'Auxiliary power', type: 'DECIMAL', required: true, unit: 'kWh' },
    ],
  },
  {
    requirementId: 'REQ-021',
    itemKey: 'TURBINE_HOURS',
    name: 'Turbine Running Hours / Detention Hours',
    sourceColumnLabel: 'Turbine Running Hours / Detention Hours',
    category: 'TURBINE',
    description: 'Turbine operating and detention hours.',
    requiredEvidence: 'Turbine log',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'turbineId', label: 'Turbine ID', type: 'TEXT', required: true },
      { key: 'runningHours', label: 'Running hours', type: 'DECIMAL', required: true },
      { key: 'detentionHours', label: 'Detention hours', type: 'DECIMAL', required: false },
    ],
  },
  {
    requirementId: 'REQ-022',
    itemKey: 'TURBINE_HEAT_RATE',
    name: 'Turbine Design Heat Rate and Feed Water Temperature',
    sourceColumnLabel: 'Turbine Design Heat Rate and Feed Water Temperature',
    category: 'TURBINE',
    description: 'Design heat rate and feed-water temperature data.',
    requiredEvidence: 'OEM datasheet / operating log',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'ANNUAL',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'designHeatRate', label: 'Design heat rate', type: 'DECIMAL', required: true },
      { key: 'feedWaterTemp', label: 'Feed water temperature', type: 'DECIMAL', required: true, unit: '°C' },
    ],
  },
  {
    requirementId: 'REQ-023',
    itemKey: 'TURBINE_ENTHALPY',
    name: 'Steam Enthalpy / Pressure / Temperature at All Extraction Points',
    sourceColumnLabel: 'Steam Enthalpy / Pressure / Temperature at all Extraction Points (Turbine)',
    category: 'TURBINE',
    description: 'Thermodynamic parameters at each turbine extraction point.',
    requiredEvidence: 'Steam table worksheet',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'extractionPoint', label: 'Extraction point', type: 'TEXT', required: true },
      { key: 'pressure', label: 'Pressure', type: 'DECIMAL', required: true },
      { key: 'temperature', label: 'Temperature', type: 'DECIMAL', required: true },
      { key: 'enthalpy', label: 'Enthalpy', type: 'DECIMAL', required: true },
    ],
  },
  {
    requirementId: 'REQ-024',
    itemKey: 'TURBINE_OA_PURCHASE',
    name: 'OA Purchase (Turbine)',
    sourceColumnLabel: 'OA Purchase (Turbine)',
    category: 'TURBINE',
    description:
      'Open-access power purchase tied to turbine / CPP operations per client checklist column (confirm business meaning with plant owner if needed).',
    requiredEvidence: 'OA invoices / settlement statements for turbine supply',
    inputType: 'MIXED',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT'],
    documentSpecs: [{ name: 'OA purchase bills (turbine-related)', required: true }],
  },
  {
    requirementId: 'REQ-025',
    itemKey: 'GRID_BILLS',
    name: 'Grid Bills',
    sourceColumnLabel: 'Grid Bills',
    category: 'ELECTRICITY_POWER',
    description: 'Grid electricity invoices for the facility.',
    requiredEvidence: 'Monthly electricity bills',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['RCO', 'PAT', 'CCTS', 'CEA'],
    documentSpecs: [{ name: 'Grid bill PDF', required: true, acceptedFileTypes: ['XLSX'] }],
  },
  {
    requirementId: 'REQ-026',
    itemKey: 'OA_PURCHASE',
    name: 'OA Purchase Data / Bills',
    sourceColumnLabel: 'OA Purchase Data / Bills',
    category: 'ELECTRICITY_POWER',
    description: 'Open access electricity purchase data and bills.',
    requiredEvidence: 'OA bills and consumption summary',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['PAT', 'RCO'],
    documentSpecs: [{ name: 'OA purchase bill', required: true }],
  },
  {
    requirementId: 'REQ-027',
    itemKey: 'DG_SET',
    name: 'DG Set Data',
    sourceColumnLabel: 'DG Set Data',
    category: 'ELECTRICITY_POWER',
    description: 'Diesel generator operating data and fuel logs.',
    requiredEvidence: 'DG logbook and fuel issue',
    inputType: 'STRUCTURED_FORM',
    reportingFrequency: 'MONTHLY',
    mandatory: false,
    defaultCompliances: ['RCO', 'PAT'],
    structuredFields: [
      { key: 'dgCapacity', label: 'DG capacity', type: 'TEXT', required: true },
      { key: 'runningHours', label: 'Running hours', type: 'DECIMAL', required: true },
      { key: 'fuelConsumption', label: 'Fuel consumption', type: 'DECIMAL', required: true },
    ],
  },
  {
    requirementId: 'REQ-028',
    itemKey: 'POWER_PER_MACHINE',
    name: 'Power Consumption Data Per Machine',
    sourceColumnLabel: 'Power Consumption Data Per Machine',
    category: 'ELECTRICITY_POWER',
    description: 'Machine-wise electricity consumption.',
    requiredEvidence: 'Sub-meter readings or allocation sheet',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'machine', label: 'Machine', type: 'TEXT', required: true },
      { key: 'powerConsumption', label: 'Power consumption', type: 'DECIMAL', required: true, unit: 'kWh' },
      { key: 'month', label: 'Month', type: 'TEXT', required: true },
    ],
  },
  {
    requirementId: 'REQ-029',
    itemKey: 'FUEL_PURCHASE',
    name: 'Fuel Purchase Data',
    sourceColumnLabel: 'Fuel Purchase Bills',
    category: 'FUEL_STOCK',
    description: 'Fuel purchase invoices and quantities.',
    requiredEvidence: 'Purchase bills / GRN',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT', 'RCO'],
    documentSpecs: [{ name: 'Fuel purchase bill', required: true }],
  },
  {
    requirementId: 'REQ-030',
    itemKey: 'FUEL_STOCK',
    name: 'Fuel Stock Data',
    sourceColumnLabel: 'Fuel Stock Data',
    category: 'FUEL_STOCK',
    description: 'Opening / closing fuel stock balances.',
    requiredEvidence: 'Stock register',
    inputType: 'MONTHLY_TABLE',
    reportingFrequency: 'MONTHLY',
    mandatory: true,
    defaultCompliances: ['PAT'],
    structuredFields: [
      { key: 'fuelType', label: 'Fuel type', type: 'TEXT', required: true },
      { key: 'openingStock', label: 'Opening stock', type: 'DECIMAL', required: true },
      { key: 'closingStock', label: 'Closing stock', type: 'DECIMAL', required: true },
    ],
  },
  {
    requirementId: 'REQ-031',
    itemKey: 'MACHINERY_LIST',
    name: 'Machinery / Equipment List (Monitoring Plan)',
    sourceColumnLabel: 'Machinery / Equipment List (Monitoring Plan)',
    category: 'EQUIPMENT_MONITORING',
    description: 'Monitoring plan equipment list.',
    requiredEvidence: 'Approved monitoring plan annexure',
    inputType: 'FILE_UPLOAD',
    reportingFrequency: 'ANNUAL',
    mandatory: true,
    defaultCompliances: ['CEA', 'RCO'],
    documentSpecs: [{ name: 'Equipment list', required: true, acceptedFileTypes: ['XLSX'] }],
  },
  {
    requirementId: 'REQ-032',
    itemKey: 'CALIBRATION_CERTS',
    name: 'Calibration Certificates for Equipment (Monitoring Plan)',
    sourceColumnLabel: 'Calibration Certificates for Equipment (Monitoring Plan)',
    category: 'EQUIPMENT_MONITORING',
    description: 'Valid calibration certificates for monitoring equipment.',
    requiredEvidence: 'Calibration certificates',
    inputType: 'FILE_UPLOAD',
    reportingFrequency: 'ANNUAL',
    mandatory: true,
    defaultCompliances: ['CEA', 'RCO'],
    documentSpecs: [{ name: 'Calibration certificate', required: true, acceptedFileTypes: ['XLSX'] }],
  },
];

const masterByKey = new Map(DATA_REQUIREMENT_MASTER.map((row) => [row.itemKey, row]));

export function getMasterRequirement(itemKey: string): IMasterRequirementRow | undefined {
  return masterByKey.get(itemKey);
}

export function masterRowsByCategory(): Record<MasterRequirementCategory, IMasterRequirementRow[]> {
  const out = Object.keys(MASTER_REQUIREMENT_CATEGORIES).reduce(
    (acc, key) => {
      acc[key as MasterRequirementCategory] = [];
      return acc;
    },
    {} as Record<MasterRequirementCategory, IMasterRequirementRow[]>
  );

  for (const row of DATA_REQUIREMENT_MASTER) {
    out[row.category].push(row);
  }
  return out;
}

/** Requirements a consultant may include in a client request. */
export function isRequestableApplicability(status: ChecklistApplicabilityStatus): boolean {
  return status === 'APPLICABLE';
}

export function isExcludedApplicability(status: ChecklistApplicabilityStatus): boolean {
  return status === 'NOT_APPLICABLE' || status === 'NOT_REQUIRED';
}

export function legacyChecklistStatusToApplicability(
  status: string,
  notes?: string
): ChecklistApplicabilityStatus {
  if (status === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (status === 'NOT_REQUIRED') return 'NOT_REQUIRED';
  if (status === 'NEEDS_VERIFICATION') return 'NEEDS_VERIFICATION';
  if (notes?.toLowerCase().includes('gcv not needed')) return 'NOT_REQUIRED';
  if (status === 'DUE' || status === 'RECEIVED') return 'APPLICABLE';
  return 'UNSELECTED';
}

export function applicabilityToLegacyChecklistStatus(
  applicability: ChecklistApplicabilityStatus,
  collectionReceived?: boolean
): 'DUE' | 'RECEIVED' | 'NOT_APPLICABLE' | 'NOT_REQUIRED' | 'NEEDS_VERIFICATION' {
  if (applicability === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (applicability === 'NOT_REQUIRED') return 'NOT_REQUIRED';
  if (applicability === 'NEEDS_VERIFICATION' || applicability === 'UNSELECTED') return 'NEEDS_VERIFICATION';
  return collectionReceived ? 'RECEIVED' : 'DUE';
}

export function categoryDataLabel(category: MasterRequirementCategory): string {
  return MASTER_REQUIREMENT_CATEGORIES[category];
}

export function energyCategoryForItem(itemKey: string): 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC' {
  const energy = new Set(['GRID_BILLS', 'OA_PURCHASE', 'DG_SET', 'POWER_PER_MACHINE', 'AUX_POWER', 'TURBINE_POWER']);
  return energy.has(itemKey) ? 'COMMON_ENERGY' : 'COMPLIANCE_SPECIFIC';
}