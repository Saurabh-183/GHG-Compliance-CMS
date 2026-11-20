'use client';

import React from 'react';
import type { IRequestDocumentSpec } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

const FILE_TYPES = ['PDF', 'XLSX', 'XLS', 'DOCX', 'PNG', 'JPG', 'Any'];

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
      { name: 'Supporting document', description: '', required: true, acceptedFileTypes: ['PDF'] },
    ]);
  };

  const update = (index: number, patch: Partial<IRequestDocumentSpec>) => {
    const copy = [...documents];
    copy[index] = { ...copy[index], ...patch };
    onChange(copy);
  };

  const remove = (index: number) => onChange(documents.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {documents.map((doc, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-950/30"
        >
          <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
            Document name
            <input
              value={doc.name}
              onChange={(e) => update(index, { name: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold pt-5">
            <input
              type="checkbox"
              checked={doc.required}
              onChange={(e) => update(index, { required: e.target.checked })}
              className="accent-emerald-700"
            />
            Mandatory
          </label>
          <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
            Description
            <input
              value={doc.description || ''}
              onChange={(e) => update(index, { description: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
            />
          </label>
          <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
            Accepted file types
            <select
              multiple
              value={doc.acceptedFileTypes || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                update(index, { acceptedFileTypes: selected });
              }}
              className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950 min-h-[80px]"
            >
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-[9px] font-normal normal-case">Hold Ctrl/Cmd to select multiple</span>
          </label>
          <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
            Sample template URL (optional)
            <input
              type="url"
              value={doc.sampleUrl || ''}
              onChange={(e) => update(index, { sampleUrl: e.target.value })}
              placeholder="Google Drive sample"
              className="w-full rounded-lg border px-3 py-2 text-xs font-mono dark:bg-slate-950"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={() => remove(index)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
      >
        <Plus className="w-4 h-4" /> Add document requirement
      </button>
    </div>
  );
}