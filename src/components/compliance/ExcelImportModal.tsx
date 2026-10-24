'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X, Check, Download } from 'lucide-react';
import { notify } from '@/lib/notify';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedUpload = () => {
    setIsProcessing(true);
    notify.info('Validating and parsing Excel structure...');
    setTimeout(() => {
      setIsProcessing(false);
      notify.success('Excel dataset imported and reconciliation rows generated successfully!');
      setSelectedFile(null);
      if (onImportSuccess) onImportSuccess();
      onClose();
    }, 1200);
  };

  const handleDownloadTemplate = () => {
    notify.info('Downloading official CSV template...');
    const csvContent =
      'data:text/csv;charset=utf-8,Month,Declared_kWh,Evidence_Bill_kWh,Consumer_Number,Meter_Number,Notes\n' +
      '2025-04,1240000,1240000,PSPCL-BARNALA-0042,L&T-99214,Apr Grid import bill\n' +
      '2025-05,1310000,1310000,PSPCL-BARNALA-0042,L&T-99214,May Grid import bill\n' +
      '2025-06,1280000,1265000,PSPCL-BARNALA-0042,L&T-99214,Jun discrepancy under review\n' +
      '2025-07,1350000,,PSPCL-BARNALA-0042,L&T-99214,Bill awaited\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Carbon_Crunch_Grid_Electricity_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Standardized Excel Data Import</h3>
              <p className="text-xs text-slate-400">Upload historical compliance metrics or monthly logs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-300">Need the official schema template?</span>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          <div
            onClick={() => {
              setSelectedFile('Trident_Paper_Monthly_Grid_Consumption_FY25-26.xlsx');
              notify.info('Selected file: Trident_Paper_Monthly_Grid_Consumption_FY25-26.xlsx');
            }}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-200 font-medium">
              {selectedFile ? selectedFile : 'Click to select or drag & drop Excel / CSV file'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports .xlsx, .xls, .csv formatted according to Carbon Crunch schema
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs flex items-center justify-between text-emerald-300">
              <span>Selected: <strong>{selectedFile}</strong> (48 KB)</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSimulatedUpload}
              disabled={!selectedFile || isProcessing}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-md"
            >
              {isProcessing ? 'Validating & Parsing...' : 'Import Dataset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
