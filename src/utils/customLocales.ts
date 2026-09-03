import type { LocaleValue } from "../components/setup/LocalePicker.types";
import type { LocalePreset } from "../constants/localePresets";
import { getPendingWords } from "../services/wordsService";

const CUSTOM_LOCALES_KEY = "wordgame_custom_locales";
const LAST_AI_LOCALE_KEY = "wordgame_last_ai_locale";
const LEGACY_LANGS_KEY = "wordgame_custom_languages";
const LEGACY_REGIONS_KEY = "wordgame_custom_regions";

function localeKey(locale: LocaleValue): string {
  return `${locale.language.trim().toLowerCase()}::${locale.region.trim().toLowerCase()}`;
}

function titleCaseSegment(segment: string): string {
  return segment
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readStoredLocales(): LocaleValue[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocaleValue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function localeFromPendingWords(
  words: { languages?: string[]; regions?: string[] }[]
): LocaleValue | null {
  for (const w of words) {
    const language = w.languages?.[0]?.trim();
    const region = w.regions?.[0]?.trim();
    if (language && region) return { language, region };
  }
  return null;
}

function readLastAiLocale(): LocaleValue | null {
  try {
    const raw = localStorage.getItem(LAST_AI_LOCALE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocaleValue;
    if (parsed?.language?.trim() && parsed?.region?.trim()) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

/** All locales saved in localStorage (paired language + region). */
export function getCustomLocales(): LocaleValue[] {
  return readStoredLocales();
}

/**
 * Locales from every source: localStorage pairs, last AI run, session pending words,
 * and legacy separate language/region lists (best-effort pairing).
 */
export function discoverCustomLocales(): LocaleValue[] {
  const byKey = new Map<string, LocaleValue>();

  const add = (locale: LocaleValue) => {
    const language = locale.language.trim();
    const region = locale.region.trim();
    if (!language || !region) return;
    byKey.set(localeKey({ language, region }), { language, region });
  };

  for (const locale of readStoredLocales()) add(locale);

  const last = readLastAiLocale();
  if (last) add(last);

  for (const [key, words] of Object.entries(getPendingWords())) {
    const fromMeta = localeFromPendingWords(words);
    if (fromMeta) {
      add(fromMeta);
      continue;
    }
    const sep = key.indexOf("::");
    if (sep === -1) continue;
    const langPart = key.slice(0, sep);
    const regPart = key.slice(sep + 2);
    if (langPart && regPart) {
      add({
        language: titleCaseSegment(langPart),
        region: titleCaseSegment(regPart),
      });
    }
  }

  // Legacy: separate lang/region lists from older AI panel (no pairs stored).
  try {
    const langsRaw = localStorage.getItem(LEGACY_LANGS_KEY);
    const regsRaw = localStorage.getItem(LEGACY_REGIONS_KEY);
    const langs = langsRaw ? (JSON.parse(langsRaw) as string[]) : [];
    const regs = regsRaw ? (JSON.parse(regsRaw) as string[]) : [];
    if (Array.isArray(langs) && Array.isArray(regs) && langs.length && regs.length) {
      add({ language: langs[langs.length - 1].trim(), region: regs[regs.length - 1].trim() });
    }
  } catch {
    /* ignore */
  }

  return [...byKey.values()];
}

/** Persist a language+region pair so it appears in locale carousels after AI generation. */
export function addCustomLocale(locale: LocaleValue): void {
  const language = locale.language.trim();
  const region = locale.region.trim();
  if (!language || !region) return;

  const next: LocaleValue = { language, region };
  const key = localeKey(next);

  try {
    const existing = readStoredLocales().filter((l) => localeKey(l) !== key);
    localStorage.setItem(CUSTOM_LOCALES_KEY, JSON.stringify([next, ...existing]));
    localStorage.setItem(LAST_AI_LOCALE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("[customLocales] Could not persist locale:", err);
  }
}

/** Copy session-only locales into localStorage so they survive refresh. */
export function syncDiscoveredLocalesToStorage(): void {
  const storedKeys = new Set(readStoredLocales().map(localeKey));
  for (const locale of discoverCustomLocales()) {
    const key = localeKey(locale);
    if (!storedKeys.has(key)) {
      addCustomLocale(locale);
      storedKeys.add(key);
    }
  }
}

export function customLocalesToPresets(locales: LocaleValue[]): LocalePreset[] {
  return locales.map((l, i) => ({
    id: `custom-${localeKey(l).replace(/::/g, "-")}-${i}`,
    label: `${l.language} · ${l.region}`,
    language: l.language,
    region: l.region,
    emoji: "✨",
  }));
}

export function localesMatch(a: LocaleValue, b: LocaleValue): boolean {
  return localeKey(a) === localeKey(b);
}
