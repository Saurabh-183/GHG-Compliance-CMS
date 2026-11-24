const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

const CODE_DISPLAY: Record<string, string> = {
  TRIDENT: 'Trident Group',
};

/** Human-readable client organization label — never a raw MongoDB id. */
export function formatClientGroupDisplayName(options: {
  clientGroupName?: string | null;
  clientGroupId?: string | null;
  clientGroupCode?: string | null;
  fallback?: string;
}): string {
  const fallback = options.fallback ?? 'Client Organization';
  const trimmedName = options.clientGroupName?.trim();
  if (trimmedName && trimmedName !== 'Client Group') {
    return trimmedName;
  }

  const code = options.clientGroupCode?.trim();
  if (code) {
    return CODE_DISPLAY[code] ?? code;
  }

  const idOrCode = options.clientGroupId?.trim();
  if (idOrCode) {
    if (CODE_DISPLAY[idOrCode]) return CODE_DISPLAY[idOrCode];
    if (!MONGO_OBJECT_ID_RE.test(idOrCode)) return idOrCode;
  }

  return fallback;
}

export function pickClientGroupNameFromFacilities(
  facilities: Array<{ clientGroupName?: string }> | undefined
): string | undefined {
  if (!facilities?.length) return undefined;
  for (const f of facilities) {
    const n = f.clientGroupName?.trim();
    if (n) return n;
  }
  return undefined;
}