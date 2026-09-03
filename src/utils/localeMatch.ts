/** Case-insensitive language match (Tamil === tamil). */
export function languageMatches(stored: string, selected: string): boolean {
  return stored.trim().toLowerCase() === selected.trim().toLowerCase();
}

/**
 * Region match tolerant of Geoapify vs preset strings.
 * "Sri Lanka" matches "Sri Lanka, Western Province, Sri Lanka" and vice versa.
 */
export function regionMatches(stored: string, selected: string): boolean {
  const s = stored.trim().toLowerCase();
  const q = selected.trim().toLowerCase();
  if (!s || !q) return false;
  if (s === q) return true;
  if (s.startsWith(`${q},`) || s.startsWith(`${q} `)) return true;
  if (q.startsWith(`${s},`) || q.startsWith(`${s} `)) return true;
  return false;
}

export function matchesLocaleFilters(
  wordLanguages: string[] | undefined,
  wordRegions: string[] | undefined,
  wantLanguages: string[] | undefined,
  wantRegions: string[] | undefined
): boolean {
  const langOk =
    !wantLanguages?.length ||
    (wordLanguages ?? []).some((l) =>
      wantLanguages.some((w) => languageMatches(l, w))
    );
  const regOk =
    !wantRegions?.length ||
    (wordRegions ?? []).some((r) =>
      wantRegions.some((w) => regionMatches(r, w))
    );
  return langOk && regOk;
}

export function parsePendingLocaleKey(key: string): { language: string; region: string } | null {
  const sep = key.indexOf("::");
  if (sep <= 0) return null;
  return {
    language: key.slice(0, sep),
    region: key.slice(sep + 2),
  };
}
