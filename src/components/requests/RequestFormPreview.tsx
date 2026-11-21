'use client';

import React from 'react';
import type { IRequestDocumentSpec, IRequestField } from '@/types';
import { ClientDynamicFieldInput } from '@/components/requests/ClientDynamicFieldInput';

export function RequestFormPreview({
  title,
  purpose,
  instructions,
  fields,
  documents,
  period,
  facilityLabel,
  dataCategory,
}: {
  title: string;
  purpose: string;
  instructions: string;
  fields: IRequestField[];
  documents: IRequestDocumentSpec[];
  period: string;
  facilityLabel: string;
  dataCategory: string;
}) {
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>>({});

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-5 space-y-4 max-h-[70vh] overflow-y-auto">
      <p className="text-[10px] font-bold uppercase text-emerald-700">Client preview</p>
      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title || 'Request title'}</h4>
      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-slate-500">Facility</dt>
          <dd className="font-semibold">{facilityLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Year / period</dt>
          <dd className="font-mono">{period}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Category</dt>
          <dd>{dataCategory || '—'}</dd>
        </div>
      </dl>
      {purpose && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <strong>Purpose:</strong> {purpose}
        </p>
      )}
      {instructions && (
        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
          <strong>Instructions:</strong> {instructions}
        </p>
      )}
      {documents.length > 0 && (
        <ul className="text-[11px] list-disc pl-4 space-y-1">
          {documents.map((d) => (
            <li key={d.name}>
              {d.name}
              {d.required ? ' (mandatory)' : ' (optional)'} — Google Drive · .xlsx
            </li>
          ))}
        </ul>
      )}
      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          {fields.map((field) => (
            <ClientDynamicFieldInput
              key={field.key}
              field={field}
              value={previewData[field.key]}
              onChange={(v) => setPreviewData((c) => ({ ...c, [field.key]: v }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}