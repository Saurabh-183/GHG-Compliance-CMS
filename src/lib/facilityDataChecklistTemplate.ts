import type { IFacilityDataChecklistItem } from '@/types';

/** Canonical report rows from the All-Clients Data Checklist master sheet. */
export const DATA_CHECKLIST_TEMPLATE_ITEMS: Omit<
  IFacilityDataChecklistItem,
  'status' | 'notes'
>[] = [
  { itemKey: 'CTO_CTE_CCA', label: 'CTO / CTE / CCA', sortOrder: 1 },
  { itemKey: 'GCV_EXT_FOSSIL', label: 'GCV Certificate — External Fossil Fuels', sortOrder: 2 },
  { itemKey: 'GCV_EXT_NON_FOSSIL', label: 'GCV Certificate — External Non-Fossil Fuels', sortOrder: 3 },
  { itemKey: 'GCV_INT_BOMB', label: 'GCV Internal — Bomb Calorimeter Reading (NCV)', sortOrder: 4 },
  { itemKey: 'ULTIMATE_ANALYSIS', label: 'Ultimate Analysis (Carbon Content) — Fossil Fuels', sortOrder: 5 },
  { itemKey: 'PROXIMATE_ANALYSIS', label: 'Proximate Analysis (Moisture, Fixed Carbon)', sortOrder: 6 },
  { itemKey: 'PROD_MONTH_ALL', label: 'Production — Month-wise Data (All Products)', sortOrder: 7 },
  { itemKey: 'PROD_MONTH_MACHINE', label: 'Production — Month-wise Per Machine Data', sortOrder: 8 },
  { itemKey: 'PROCESS_FLOW', label: 'Process Flow Diagram', sortOrder: 9 },
  { itemKey: 'BOILER_STEAM_LOG', label: 'Boiler Steam Generation Log Books', sortOrder: 10 },
  { itemKey: 'BOILER_HOURS', label: 'Boiler Running Hours / Detention Hours', sortOrder: 11 },
  {
    itemKey: 'BOILER_STEAM_PARAMS',
    label: 'Boiler SH Steam Pressure / Temperature / Enthalpy / Design & Operating Efficiency',
    sortOrder: 12,
  },
  { itemKey: 'BOILER_FUEL', label: 'Per Boiler Fuel Consumption Data', sortOrder: 13 },
  { itemKey: 'STEAM_CONSUMPTION', label: 'Steam Consumption Across Units', sortOrder: 14 },
  { itemKey: 'TURBINE_GEN_LOG', label: 'Turbine Generation Log Books', sortOrder: 15 },
  { itemKey: 'TURBINE_EXTRACTION', label: 'Turbine Extraction Point Steam Data', sortOrder: 16 },
  { itemKey: 'TURBINE_POWER', label: 'Turbine Power Generation Data', sortOrder: 17 },
  { itemKey: 'AUX_POWER', label: 'Auxiliary Power Generation', sortOrder: 18 },
  { itemKey: 'TURBINE_HOURS', label: 'Turbine Running Hours / Detention Hours', sortOrder: 19 },
  { itemKey: 'TURBINE_HEAT_RATE', label: 'Turbine Design Heat Rate and Feed Water Temperature', sortOrder: 20 },
  {
    itemKey: 'TURBINE_ENTHALPY',
    label: 'Steam Enthalpy / Pressure / Temperature at all Extraction Points (Turbine)',
    sortOrder: 21,
  },
  { itemKey: 'GRID_BILLS', label: 'Grid Bills', sortOrder: 22 },
  { itemKey: 'OA_PURCHASE', label: 'OA Purchase Data / Bills', sortOrder: 23 },
  { itemKey: 'DG_SET', label: 'DG Set Data', sortOrder: 24 },
  { itemKey: 'POWER_PER_MACHINE', label: 'Power Consumption Data Per Machine', sortOrder: 25 },
  { itemKey: 'INTERMEDIATE_SALE', label: 'Intermediate Product Sale Data', sortOrder: 26 },
  { itemKey: 'INTERMEDIATE_PURCHASE', label: 'Intermediate Product Purchase Data', sortOrder: 27 },
  { itemKey: 'FUEL_PURCHASE', label: 'Fuel Purchase Bills', sortOrder: 28 },
  { itemKey: 'FUEL_STOCK', label: 'Fuel Stock Data', sortOrder: 29 },
  { itemKey: 'MACHINERY_LIST', label: 'Machinery / Equipment List (Monitoring Plan)', sortOrder: 30 },
  {
    itemKey: 'CALIBRATION_CERTS',
    label: 'Calibration Certificates for Equipment (Monitoring Plan)',
    sortOrder: 31,
  },
];

export const DEFAULT_CHECKLIST_PERIOD = 'FY2025-26';

export function buildDefaultChecklistItems(): IFacilityDataChecklistItem[] {
  return DATA_CHECKLIST_TEMPLATE_ITEMS.map((row) => ({
    ...row,
    status: 'DUE',
    notes: '',
  }));
}