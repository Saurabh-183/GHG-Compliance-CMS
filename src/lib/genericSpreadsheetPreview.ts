function splitDelimitedLine(line: string): string[] {
  const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : ',';
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      result.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result.map((c) => c.trim());
}

export interface SpreadsheetPreviewRow {
  rowIndex: number;
  cells: Record<string, string>;
}

export function parseSpreadsheetPreviewTable(
  csvText: string,
  maxRows = 12
): { headers: string[]; rows: SpreadsheetPreviewRow[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.replace(/"/g, '').trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitDelimitedLine(lines[0]).map((h, i) => h || `Column ${i + 1}`);
  const rows: SpreadsheetPreviewRow[] = [];

  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    const cols = splitDelimitedLine(lines[i]);
    if (cols.every((c) => !c)) continue;
    const cells: Record<string, string> = {};
    headers.forEach((h, idx) => {
      cells[h] = cols[idx] ?? '';
    });
    rows.push({ rowIndex: i, cells });
  }

  return { headers, rows };
}

export function isElectricityEvidenceContext(input: {
  dataCategory?: string;
  requirementTitle?: string;
  sourceChecklistItemKey?: string;
}): boolean {
  const blob = [input.dataCategory, input.requirementTitle, input.sourceChecklistItemKey]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    blob.includes('electric') ||
    blob.includes('pspcl') ||
    blob.includes('ht bill') ||
    (blob.includes('power') && blob.includes('bill')) ||
    blob.includes('grid_import') ||
    blob.includes('common_energy')
  );
}

export function structuredDataToDisplayRows(
  data?: Record<string, unknown> | null,
  labelByKey?: Map<string, string>
): Array<{ key: string; label: string; value: string }> {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([key, value]) => ({
      key,
      label: labelByKey?.get(key) || key.replace(/_/g, ' '),
      value:
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value),
    }));
}