'use client';

import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  Check,
  Download,
  AlertCircle,
  Folder,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { notify } from '@/lib/notify';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityId?: string;
  onImportSuccess?: () => void;
}

type ComplianceTemplateType = 'GRID_ELECTRICITY' | 'RCO' | 'PAT' | 'CCTS' | 'CEA';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  facilityId = 'TRIDENT_PAPER',
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'templates'>('upload');
  const [selectedCategory, setSelectedCategory] = useState<
    'GRID_ELECTRICITY' | 'RENEWABLE_PURCHASE' | 'FUEL_CONSUMPTION' | 'PRODUCTION'
  >('GRID_ELECTRICITY');
  const [driveFolderUrl, setDriveFolderUrl] = useState(
    'https://drive.google.com/drive/folders/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7'
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle local file selection and CSV/Text parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
        parseAndPreviewRows(text);
      }
    };
    reader.readAsText(file);
  };

  const parseAndPreviewRows = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      notify.warning('File contains no data rows');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const mIdx = headers.findIndex((h) => h.includes('month'));
    const decIdx = headers.findIndex((h) => h.includes('declared') || h.includes('value'));
    const eviIdx = headers.findIndex((h) => h.includes('evidence') || h.includes('bill'));
    const unitIdx = headers.findIndex((h) => h.includes('unit'));
    const driveIdx = headers.findIndex((h) => h.includes('drive') || h.includes('link') || h.includes('url'));
    const cNoIdx = headers.findIndex((h) => h.includes('consumer'));
    const mNoIdx = headers.findIndex((h) => h.includes('meter'));

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const month = mIdx >= 0 ? cols[mIdx] : `2025-${String(i).padStart(2, '0')}`;
      const declaredValue = decIdx >= 0 ? parseFloat(cols[decIdx]) || 0 : 0;
      const evidenceRaw = eviIdx >= 0 ? cols[eviIdx] : '';
      const evidenceValue = evidenceRaw !== '' && !isNaN(Number(evidenceRaw)) ? parseFloat(evidenceRaw) : null;
      const unit = unitIdx >= 0 && cols[unitIdx] ? cols[unitIdx] : selectedCategory === 'GRID_ELECTRICITY' ? 'kWh' : 'Units';
      const driveUrl = driveIdx >= 0 && cols[driveIdx] ? cols[driveIdx] : `${driveFolderUrl}/Bills/${month}_Bill.pdf`;

      rows.push({
        month,
        declaredValue,
        evidenceValue,
        unit,
        evidenceDocumentUrl: driveUrl,
        consumerNumber: cNoIdx >= 0 ? cols[cNoIdx] : 'PSPCL-BARNALA-0042',
        meterNumber: mNoIdx >= 0 ? cols[mNoIdx] : 'L&T-EM-99214',
      });
    }

    setParsedRows(rows);
    notify.success(`Parsed ${rows.length} rows from file! Ready to import.`);
  };

  const handleSimulateSample = () => {
    const sample =
      'Month,Declared_Value,Evidence_Bill_Value,Unit,Consumer_Number,Meter_Number,Drive_Evidence_URL,Notes\n' +
      '2025-04,1240000,1240000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Apr25.pdf,Apr import\n' +
      '2025-05,1310000,1310000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_May25.pdf,May import\n' +
      '2025-06,1280000,1265000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Jun25.pdf,Jun variance\n' +
      '2025-07,1350000,1350000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Jul25.pdf,Jul import\n' +
      '2025-08,1290000,1290000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Aug25.pdf,Aug import\n' +
      '2025-09,1320000,1320000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Sep25.pdf,Sep import\n' +
      '2025-10,1275000,1275000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Oct25.pdf,Oct import\n' +
      '2025-11,1300000,1300000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Nov25.pdf,Nov import\n' +
      '2025-12,1340000,1340000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Dec25.pdf,Dec import\n' +
      '2026-01,1315000,1315000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Jan26.pdf,Jan import\n' +
      '2026-02,1285000,1285000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Feb26.pdf,Feb import\n' +
      '2026-03,1360000,1360000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/PSPCL_Mar26.pdf,Mar import\n';

    setSelectedFileName(`${facilityId}_${selectedCategory}_FY25-26.csv`);
    setCsvContent(sample);
    parseAndPreviewRows(sample);
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) {
      notify.warning('Please select an Excel or CSV file first');
      return;
    }

    setIsProcessing(true);
    notify.info('Importing rows and updating live reconciliation dataset...');

    try {
      const res = await fetch('/api/datasets/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          datasetType: selectedCategory,
          period: 'FY2025-26',
          driveFolderUrl,
          tolerance: 0,
          rows: parsedRows,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        notify.success(
          `Import successful! ${json.data.totalMonths} months updated. Data Given: ${json.data.dataGivenPercentage}%, Matched: ${json.data.dataMatchedPercentage}%.`
        );
        if (onImportSuccess) onImportSuccess();
        onClose();
      } else {
        notify.error(json.error || 'Failed to import Excel data');
      }
    } catch {
      notify.error('Network error during Excel import');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = (type: ComplianceTemplateType) => {
    let filename = '';
    let csvData = '';

    switch (type) {
      case 'RCO':
        filename = 'CarbonCrunch_RCO_Compliance_Template.csv';
        csvData =
          'Month,Applicable_Target_Pct,Achieved_RE_Pct,RE_Electricity_kWh,Non_RE_Electricity_kWh,Grid_Import_kWh,REC_Adjustment,Drive_Evidence_URL\n' +
          '2025-04,29.91,25.51,320000,920000,1240000,0,https://drive.google.com/file/d/RCO_Apr2025.pdf\n' +
          '2025-05,29.91,26.10,342000,968000,1310000,0,https://drive.google.com/file/d/RCO_May2025.pdf\n';
        break;
      case 'PAT':
        filename = 'CarbonCrunch_PAT_Cycle_SEC_Template.csv';
        csvData =
          'Month,Production_Tonnes,Total_Energy_TOE,Specific_Energy_Consumption_SEC,Target_SEC,Normalization_Factor,Drive_Evidence_URL\n' +
          '2025-04,4500,1250,0.277,0.260,1.02,https://drive.google.com/file/d/PAT_Log_Apr2025.pdf\n';
        break;
      case 'CCTS':
        filename = 'CarbonCrunch_CCTS_GHG_Emissions_Template.csv';
        csvData =
          'Month,Fuel_Type,Quantity_Tonnes,GCV_kcal_kg,Direct_Emissions_tCO2,Emission_Intensity,Drive_Evidence_URL\n' +
          '2025-04,Imported Coal,3200,5400,6850,1.52,https://drive.google.com/file/d/CCTS_Fuel_Apr2025.pdf\n';
        break;
      case 'CEA':
        filename = 'CarbonCrunch_CEA_Electricity_Returns_Template.csv';
        csvData =
          'Month,Return_Form,Gross_Generation_kWh,Auxiliary_Consumption_kWh,Net_Export_kWh,Filing_Status,Drive_Acknowledgement_URL\n' +
          '2025-04,Form-1,2400000,180000,2220000,FILED,https://drive.google.com/file/d/CEA_Ack_Apr2025.pdf\n';
        break;
      default:
        filename = 'CarbonCrunch_Monthly_Grid_Electricity_Template.csv';
        csvData =
          'Month,Declared_Value,Evidence_Bill_Value,Unit,Consumer_Number,Meter_Number,Drive_Evidence_URL,Notes\n' +
          '2025-04,1240000,1240000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/Bill_Apr25.pdf,Apr DISCOM Bill\n' +
          '2025-05,1310000,1310000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/Bill_May25.pdf,May DISCOM Bill\n' +
          '2025-06,1280000,1265000,kWh,PSPCL-BARNALA-0042,L&T-EM-99214,https://drive.google.com/file/d/Bill_Jun25.pdf,Jun Discrepancy\n';
        break;
    }

    notify.info(`Downloading official ${type} template...`);
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvData}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Standardized Excel Import & Compliance Templates
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Facility: <strong className="text-slate-700 dark:text-slate-300">{facilityId}</strong> · Category-based Evidence & Excel Processing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Excel / CSV Import Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Official Compliance Excel Templates</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {activeTab === 'upload' ? (
            <div className="space-y-5">
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Data Category:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'GRID_ELECTRICITY', label: 'Grid Electricity' },
                    { id: 'RENEWABLE_PURCHASE', label: 'Renewable Power' },
                    { id: 'FUEL_CONSUMPTION', label: 'Fuel / Coal' },
                    { id: 'PRODUCTION', label: 'Plant Production' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`p-2.5 rounded-lg border text-center font-medium transition-colors text-xs ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Drive Master Link for Evidence Mapping */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Google Drive Folder for Evidence Documents:
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs pr-10 focus:outline-none focus:border-emerald-500"
                  />
                  <Folder className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Evidence links in each row will be mapped to this Google Drive directory.
                </p>
              </div>

              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-950/50 transition-all">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".csv, .xlsx, .xls, .txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedFileName ? selectedFileName : 'Choose CSV or Excel file to upload'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepts .csv, .xlsx formatted with Month, Declared_Value, Evidence_Bill_Value, Drive_URL
                  </p>
                </label>
              </div>

              {/* Sample Data Quick Loader */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 text-xs">
                  Or load standard 12-month FY25-26 compliance dataset:
                </span>
                <button
                  type="button"
                  onClick={handleSimulateSample}
                  className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-400 font-semibold transition-colors text-xs"
                >
                  Load 12-Month Sample Dataset
                </button>
              </div>

              {/* Parsed Rows Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>Parsed Preview ({parsedRows.length} months detected):</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ✓ Evidence mapped with Drive
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2 px-3">Month</th>
                          <th className="py-2 px-3">Declared</th>
                          <th className="py-2 px-3">Evidence</th>
                          <th className="py-2 px-3">Drive Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {parsedRows.slice(0, 6).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 font-mono font-semibold">{row.month}</td>
                            <td className="py-1.5 px-3 font-mono">{row.declaredValue.toLocaleString()} {row.unit}</td>
                            <td className="py-1.5 px-3 font-mono">
                              {row.evidenceValue !== null ? `${row.evidenceValue.toLocaleString()} ${row.unit}` : '—'}
                            </td>
                            <td className="py-1.5 px-3 truncate max-w-[200px] text-emerald-700 dark:text-emerald-400 font-mono">
                              {row.evidenceDocumentUrl}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Compliance Templates Tab */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Download official, audit-ready CSV templates for each statutory framework. Clients can populate these sheets with declared figures and corresponding Google Drive URLs before re-uploading.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    type: 'RCO' as ComplianceTemplateType,
                    title: 'RCO / RPO Obligation Template',
                    desc: 'Renewable share, grid import, captive generation, open-access, REC reconciliation.',
                  },
                  {
                    type: 'PAT' as ComplianceTemplateType,
                    title: 'PAT Scheme SEC Template',
                    desc: 'Baseline SEC, target SEC, monthly production, energy consumption, normalization.',
                  },
                  {
                    type: 'CCTS' as ComplianceTemplateType,
                    title: 'CCTS GHG Emissions Template',
                    desc: 'Direct emissions, fuel invoices, GCV certificates, covered fuels.',
                  },
                  {
                    type: 'CEA' as ComplianceTemplateType,
                    title: 'CEA Electricity Returns Template',
                    desc: 'Form 1/2 monthly statutory returns, generation, auxiliary consumption.',
                  },
                  {
                    type: 'GRID_ELECTRICITY' as ComplianceTemplateType,
                    title: 'Monthly Grid Consumption & Bills',
                    desc: 'Month-wise declared vs DISCOM bill units with Google Drive evidence links.',
                  },
                ].map((tpl) => (
                  <div
                    key={tpl.type}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{tpl.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tpl.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(tpl.type)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template (.csv)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'upload' && (
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isProcessing || parsedRows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Importing Dataset...' : `Import ${parsedRows.length} Rows into Database`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
