'use client';

import React, { useState } from 'react';
import type { IRequestField, RequestFieldType } from '@/types';
import { ALLOWED_FIELD_TYPES, ensureUniqueFieldKey } from '@/lib/requestFieldUtils';
import { FIELD_UNITS } from '@/lib/dataRequestCategories';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { Select, MenuItem, FormControl, Checkbox } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

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
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState<number | null>(fields.length ? 0 : null);

  const addField = () => {
    const label = 'New field';
    const next: IRequestField = {
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    if (!current.id) {
      current.id = copy[index].id || `fld_${index}_${copy[index].key || 'field'}`;
    }
    if (patch.label !== undefined && !patch.key) {
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
    const next: IRequestField = {
      ...source,
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      key: ensureUniqueFieldKey(label, fields),
      label,
    };
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

  const muiSelectSx = {
    height: 36,
    fontSize: '12px',
    borderRadius: '8px',
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#0F172A',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#34D399' : '#059669',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#34D399' : '#059669',
      borderWidth: '1.5px',
    },
    '& .MuiSelect-select': { py: '6px', px: '12px' },
  };

  const muiMenuProps = {
    slotProps: {
      paper: {
        sx: {
          maxHeight: 280,
          borderRadius: '8px',
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          color: isDark ? '#FFFFFF' : '#0F172A',
          border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        },
      },
    },
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
        const fieldKey = field.id || `fld_${index}`;
        return (
          <div
            key={fieldKey}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : index)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
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
                    type="text"
                    value={field.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                    placeholder="e.g. Total Coal Consumed"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1">
                  Field key (auto)
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => update(index, { key: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Input type</span>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={field.type}
                      onChange={(e) => update(index, { type: e.target.value as RequestFieldType })}
                      sx={muiSelectSx}
                      MenuProps={muiMenuProps}
                    >
                      {ALLOWED_FIELD_TYPES.map((t) => (
                        <MenuItem key={t} value={t} sx={{ fontSize: '12px' }}>
                          {TYPE_LABELS[t]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Unit</span>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={field.unit || '—'}
                      onChange={(e) => update(index, { unit: e.target.value })}
                      sx={muiSelectSx}
                      MenuProps={muiMenuProps}
                    >
                      {FIELD_UNITS.map((u) => (
                        <MenuItem key={u} value={u} sx={{ fontSize: '12px' }}>
                          {u}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2 cursor-pointer">
                  <Checkbox
                    checked={field.required}
                    onChange={(e) => update(index, { required: e.target.checked })}
                    size="small"
                    sx={{
                      color: isDark ? '#64748B' : '#94A3B8',
                      '&.Mui-checked': { color: isDark ? '#34D399' : '#059669' },
                    }}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Mandatory field</span>
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                  Help text
                  <input
                    type="text"
                    value={field.helpText || ''}
                    onChange={(e) => update(index, { helpText: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                    placeholder="Instructions or guidance for this field"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                  Placeholder
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => update(index, { placeholder: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                    placeholder="e.g. Enter value..."
                  />
                </label>
                {(field.type === 'SELECT' || field.type === 'RADIO') && (
                  <label className="text-[10px] font-bold uppercase text-slate-500 space-y-1 sm:col-span-2">
                    Dropdown options (comma-separated)
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={(e) =>
                        update(index, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
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
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
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
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                      />
                    </label>
                  </>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => move(index, -1)} className="p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" title="Move up">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} className="p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" title="Move down">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => duplicate(index)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button type="button" onClick={() => remove(index)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-bold ml-auto hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">
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
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add field
      </button>
    </div>
  );
}