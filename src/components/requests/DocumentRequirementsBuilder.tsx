'use client';

import React from 'react';
import type { IRequestDocumentSpec } from '@/types';
import { DEFAULT_ACCEPTED_FILE_TYPES, DEFAULT_SUBMISSION_FORMAT } from '@/lib/submissionPolicy';
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react';

export function DocumentRequirementsBuilder({
  documents,
  onChange,
}: {
  documents: IRequestDocumentSpec[];
  onChange: (docs: IRequestDocumentSpec[]) => void;
}) {
  const add = () => {
    onChange([
      ...documents,
      {
        name: 'Supporting workbook',
        description: 'Upload .xlsx to Google Drive and share the link.',
        required: true,
        acceptedFileTypes: [...DEFAULT_ACCEPTED_FILE_TYPES],
      },
    ]);
  };

  const update = (index: number, patch: Partial<IRequestDocumentSpec>) => {
    const copy = [...documents];
    copy[index] = {
      ...copy[index],
      ...patch,
      acceptedFileTypes: [...DEFAULT_ACCEPTED_FILE_TYPES],
    };
    onChange(copy);
  };

  const remove = (index: number) => onChange(documents.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-[10px] text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <span>
          Submission: <strong>{DEFAULT_SUBMISSION_FORMAT}</strong> · File type: <strong>.xlsx only</strong>
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-emerald-800 dark:text-emerald-300">
          <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
        </span>
      </div>

      {documents.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
          No document rows yet. Add a workbook name clients should upload to Drive.
        </p>
      )}

      {documents.map((doc, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-start">
            <label className="sm:col-span-5 space-y-1 text-[10px] font-bold uppercase text-slate-500">
              Document / workbook name
              <input
                value={doc.name}
                onChange={(e) => update(index, { name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-xs font-normal normal-case dark:bg-slate-950"
                placeholder="e.g. Monthly production register"
              />
            </label>
            <label className="sm:col-span-5 space-y-1 text-[10px] font-bold uppercase text-slate-500">
              Description for client
              <input
                value={doc.description || ''}
                onChange={(e) => update(index, { description: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-xs font-normal normal-case dark:bg-slate-950"
                placeholder="What should be inside the .xlsx"
              />
            </label>
            <label className="sm:col-span-2 flex items-center gap-2 pt-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={doc.required}
                onChange={(e) => update(index, { required: e.target.checked })}
                className="accent-emerald-700"
              />
              Mandatory
            </label>
            <label className="sm:col-span-5 space-y-1 text-[10px] font-bold uppercase text-slate-500">
              Sample template (Drive URL, optional)
              <input
                type="url"
                value={doc.sampleUrl || ''}
                onChange={(e) => update(index, { sampleUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-lg border px-3 py-2 text-xs font-mono font-normal normal-case dark:bg-slate-950"
              />
            </label>
            <div className="sm:col-span-7 flex flex-wrap items-center justify-end gap-2 pt-4 sm:pt-5">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-mono font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40">
                .xlsx via Google Drive
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-slate-600 dark:hover:bg-emerald-950/20"
      >
        <Plus className="h-4 w-4" /> Add document requirement
      </button>
    </div>
  );
}