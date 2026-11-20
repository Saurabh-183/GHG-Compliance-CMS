'use client';

import React from 'react';
import type { IRequestField } from '@/types';

export function ClientDynamicFieldInput({
  field,
  value,
  onChange,
  highlightError,
  errorHint,
}: {
  field: IRequestField;
  value: unknown;
  onChange: (next: unknown) => void;
  highlightError?: boolean;
  errorHint?: string;
}) {
  const wrap = `text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1.5 rounded-lg p-2 ${
    highlightError ? 'border border-rose-300 bg-rose-50/60 dark:bg-rose-950/20' : ''
  }`;

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-normal text-slate-900 dark:text-white';

  const label = (
    <>
      {field.label} {field.required && <span className="text-rose-500">*</span>}
      {field.unit && field.unit !== '—' && (
        <span className="text-[10px] font-normal text-slate-500 ml-1">({field.unit})</span>
      )}
      {field.helpText && <span className="block text-[10px] font-normal text-slate-500">{field.helpText}</span>}
      {errorHint && (
        <span className="block text-[10px] text-rose-700 dark:text-rose-300 font-bold">{errorHint}</span>
      )}
    </>
  );

  switch (field.type) {
    case 'SELECT':
    case 'RADIO':
      return (
        <label className={wrap}>
          {label}
          <select
            value={String(value ?? field.defaultValue ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{field.placeholder || 'Select'}</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    case 'YES_NO':
      return (
        <label className={wrap}>
          {label}
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
      );
    case 'CHECKBOX':
      return (
        <label className={`${wrap} flex items-center gap-2`}>
          <input
            type="checkbox"
            checked={Boolean(value ?? field.defaultValue)}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-emerald-700"
          />
          {label}
        </label>
      );
    case 'LONG_TEXT':
      return (
        <label className={`${wrap} sm:col-span-2`}>
          {label}
          <textarea
            rows={3}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </label>
      );
    case 'URL':
      return (
        <label className={wrap}>
          {label}
          <input
            type="url"
            value={String(value ?? '')}
            placeholder={field.placeholder || 'https://'}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </label>
      );
    case 'FILE_UPLOAD':
      return (
        <label className={wrap}>
          {label}
          <input
            type="text"
            value={String(value ?? '')}
            placeholder={field.placeholder || 'Paste Google Drive link for this file'}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} font-mono`}
          />
          <span className="text-[10px] text-slate-500">Use the main Drive evidence section or paste a link here.</span>
        </label>
      );
    case 'DATE':
      return (
        <label className={wrap}>
          {label}
          <input type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </label>
      );
    case 'NUMBER':
    case 'DECIMAL':
      return (
        <label className={wrap}>
          {label}
          <input
            type="number"
            step={field.type === 'DECIMAL' ? 'any' : '1'}
            min={field.validationMin}
            max={field.validationMax}
            value={value === undefined || value === '' ? '' : String(value)}
            placeholder={field.placeholder}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : field.type === 'DECIMAL' ? Number(e.target.value) : Number(e.target.value))
            }
            className={inputClass}
          />
        </label>
      );
    case 'MONTHLY_TABLE':
      return (
        <label className={`${wrap} sm:col-span-2`}>
          {label}
          <textarea
            rows={2}
            value={String(value ?? '')}
            placeholder="Enter monthly values or paste from Excel (one line per month)"
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </label>
      );
    default:
      return (
        <label className={wrap}>
          {label}
          <input
            type="text"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </label>
      );
  }
}