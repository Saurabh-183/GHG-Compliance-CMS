import type { IRequestField, RequestFieldType } from '@/types';

export const ALLOWED_FIELD_TYPES: RequestFieldType[] = [
  'TEXT',
  'NUMBER',
  'DECIMAL',
  'DATE',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'MONTHLY_TABLE',
  'LONG_TEXT',
  'URL',
  'YES_NO',
  'FILE_UPLOAD',
];

export function slugifyFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || `field_${Date.now()}`;
}

export function ensureUniqueFieldKey(label: string, existing: IRequestField[]): string {
  let key = slugifyFieldKey(label);
  const keys = new Set(existing.map((f) => f.key));
  let n = 2;
  while (keys.has(key)) {
    key = `${slugifyFieldKey(label)}_${n}`;
    n += 1;
  }
  return key;
}

export function normalizeField(field: IRequestField): IRequestField {
  return {
    ...field,
    key: field.key.trim(),
    label: field.label.trim(),
    required: Boolean(field.required),
    options: field.options?.map((o) => o.trim()).filter(Boolean),
  };
}

export function validateFields(fields: IRequestField[]): string | null {
  if (!fields.length) return null;
  const keys = new Set<string>();
  const labels = new Set<string>();
  for (const field of fields) {
    if (!field.label?.trim()) return 'Every field must have a label.';
    if (!field.key?.trim()) return `Field "${field.label}" needs a key.`;
    if (!ALLOWED_FIELD_TYPES.includes(field.type)) return `Invalid type for "${field.label}".`;
    if (keys.has(field.key)) return `Duplicate field key: ${field.key}`;
    if (labels.has(field.label.toLowerCase())) return `Duplicate field label: ${field.label}`;
    keys.add(field.key);
    labels.add(field.label.toLowerCase());
    if ((field.type === 'SELECT' || field.type === 'RADIO') && !(field.options?.length)) {
      return `Dropdown/radio field "${field.label}" needs at least one option.`;
    }
  }
  return null;
}