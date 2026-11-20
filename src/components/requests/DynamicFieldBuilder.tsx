'use client';

import React, { useState } from 'react';
import type { IRequestField, RequestFieldType } from '@/types';
import { ALLOWED_FIELD_TYPES, ensureUniqueFieldKey } from '@/lib/requestFieldUtils';
import { FIELD_UNITS } from '@/lib/dataRequestCategories';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';

const TYPE_LABELS: Record<RequestFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DECIMAL: 'Decimal',
  DATE: 'Date',
  SELECT: 'Dropdown',
  RADIO: 'Radio',
  CHECKBOX: 'Checkbox',
  MONTHLY_TABLE: 'Monthly data table',
  LONG_TEXT: 'Long text',
  URL: 'URL',
  YES_NO: 'Yes / No',
  FILE_UPLOAD: 'File upload (Drive link)',
};

export function DynamicFieldBuilder({
  fields,
  onChange,
}: {
  fields: IRequestField[];
  onChange: (fields: IRequestField[]) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(fields.length ? 0 : null);

  const addField = () => {
    const label = 'New field';
    const next: IRequestField = {
      key: ensureUniqueFieldKey(label, fields),
      label,
      type: 'TEXT',
      required: false,
      unit: '—',
    };
    onChange([...fields, next]);
    setExpanded(fields.length);
  };

  const update = (index: number, patch: Partial<IRequestField>) => {
    const copy = [...fields];
    const current = { ...copy[index], ...patch };
    if (patch.label && !patch.key) {
      current.key = ensureUniqueFieldKey(patch.label, copy.filter((_, i) => i !== index));
    }
    if (patch.type === 'YES_NO' && !current.options?.length) {
      current.options = ['Yes', 'No'];
    }
    copy[index] = current;
    onChange(copy);
  };

  const remove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
    setExpanded(null);
  };

  const duplicate = (index: number) => {
    const source = fields[index];
    const label = `${source.label} (copy)`;
    const next = { ...source, key: ensureUniqueFieldKey(label, fields), label };
    onChange([...fields.slice(0, index + 1), next, ...fields.slice(index + 1)]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const copy = [...fields];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
    setExpanded(target);
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-slate-500 py-4 text-center border border-dashed rounded-xl">
          No fields yet. Click &quot;Add field&quot; or load a category template.
        </p>
      )}

      {fields.map((field, index) => {
        const isOpen = expanded === index;
        return (
          <div
            key={`${field.key}-${index}`}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : index)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {field.label || 'Untitled field'}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{TYPE_LABELS[field.type]}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                  Field label
                  <input
                    value={field.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                  Field key (auto)
                  <input
                    value={field.key}
                    onChange={(e) => update(index, { key: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-xs font-mono dark:bg-slate-950"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                  Input type
                  <select
                    value={field.type}
                    onChange={(e) => update(index, { type: e.target.value as RequestFieldType })}
                    className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                  >
                    {ALLOWED_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                  Unit
                  <select
                    value={field.unit || '—'}
                    onChange={(e) => update(index, { unit: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                  >
                    {FIELD_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => update(index, { required: e.target.checked })}
                    className="accent-emerald-700"
                  />
                  Mandatory field
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                  Help text
                  <input
                    value={field.helpText || ''}
                    onChange={(e) => update(index, { helpText: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                  Placeholder
                  <input
                    value={field.placeholder || ''}
                    onChange={(e) => update(index, { placeholder: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                  />
                </label>
                {(field.type === 'SELECT' || field.type === 'RADIO') && (
                  <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                    Dropdown options (comma-separated)
                    <input
                      value={(field.options || []).join(', ')}
                      onChange={(e) =>
                        update(index, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                    />
                  </label>
                )}
                {(field.type === 'NUMBER' || field.type === 'DECIMAL') && (
                  <>
                    <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                      Min value
                      <input
                        type="number"
                        value={field.validationMin ?? ''}
                        onChange={(e) =>
                          update(index, {
                            validationMin: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                      />
                    </label>
                    <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                      Max value
                      <input
                        type="number"
                        value={field.validationMax ?? ''}
                        onChange={(e) =>
                          update(index, {
                            validationMax: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-xs dark:bg-slate-950"
                      />
                    </label>
                  </>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => move(index, -1)} className="p-2 border rounded-lg" title="Move up">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} className="p-2 border rounded-lg" title="Move down">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => duplicate(index)} className="inline-flex items-center gap-1 px-2 py-1 border rounded-lg text-[10px] font-bold">
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button type="button" onClick={() => remove(index)} className="inline-flex items-center gap-1 px-2 py-1 border border-rose-300 text-rose-700 rounded-lg text-[10px] font-bold ml-auto">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addField}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
      >
        <Plus className="w-4 h-4" /> Add field
      </button>
    </div>
  );
}