import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchRegionSuggestions, type GeoapifySuggestion } from "../../services/geoapify";
import {
  getLanguageSuggestions,
  getLanguageSuggestionsSync,
  type LanguageSuggestion,
} from "../../services/languageAutocomplete";
import {
  generateWordsFromApi,
  generateWordsMiniFromApi,
  generateNicheWordsFromApi,
} from "../../services/wordGenerationService";
import { addWordsToFirestore, setPendingWordsEntry } from "../../services/wordsService";
import { addCustomLocale } from "../../utils/customLocales";
import { UI_STRINGS } from "../../constants/strings";
import {
  AI_GENERATION_LANGUAGES,
  isAiGenerationLanguage,
  normalizeNicheCategoryName,
} from "../../constants/categories";
import type { LocalePreset } from "../../constants/localePresets";
import LocaleCarousel from "./LocaleCarousel";
import type { LocaleValue } from "./LocalePicker.types";
import styles from "./AiWordGenPanel.module.css";

const CUSTOM_LANGS_KEY = "wordgame_custom_languages";
const CUSTOM_REGIONS_KEY = "wordgame_custom_regions";

function saveCustomLanguage(lang: string) {
  try {
    const raw = localStorage.getItem(CUSTOM_LANGS_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(lang);
    localStorage.setItem(CUSTOM_LANGS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function saveCustomRegion(region: string) {
  try {
    const raw = localStorage.getItem(CUSTOM_REGIONS_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(region);
    localStorage.setItem(CUSTOM_REGIONS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

type WordsGeneratedEvent = {
  language: string;
  region: string;
  wordCount: number;
  phase: "mini" | "full";
};

type AiTab = "locale" | "niche";

type Props = {
  locale: LocaleValue;
  onLocaleChange: (next: LocaleValue) => void;
  disabled?: boolean;
  onStartRandom?: () => void;
  startBusy?: boolean;
  onWordsGenerated?: (event: WordsGeneratedEvent) => void;
  extraPresets?: LocalePreset[];
};

export default function AiWordGenPanel({
  locale,
  onLocaleChange,
  disabled,
  onStartRandom,
  startBusy,
  onWordsGenerated,
  extraPresets = [],
}: Props) {
  const [tab, setTab] = useState<AiTab>("locale");
  const [language, setLanguage] = useState(locale.language);
  const [region, setRegion] = useState(locale.region);
  const [nicheCategory, setNicheCategory] = useState("");
  const [nicheRegion, setNicheRegion] = useState("UK");
  const [langSuggestions, setLangSuggestions] = useState<LanguageSuggestion[]>([]);
  const [regionSuggestions, setRegionSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [langIndex, setLangIndex] = useState(-1);
  const [regionIndex, setRegionIndex] = useState(-1);
  const [loadingLang, setLoadingLang] = useState(false);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewWords, setPreviewWords] = useState<
    { word: string; category: string }[]
  >([]);

  const debouncedLang = useDebounce(language, 200);
  const debouncedRegion = useDebounce(region, 300);
  const geoKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

  const langRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  const languageSupported = isAiGenerationLanguage(language);
  const unsupportedHint = UI_STRINGS.SETUP_AI_LANG_UNSUPPORTED.replace(
    "{langs}",
    AI_GENERATION_LANGUAGES.join(", ")
  );

  useEffect(() => {
    setLanguage(locale.language);
    setRegion(locale.region);
  }, [locale.language, locale.region]);

  useEffect(() => {
    if (!debouncedLang.trim()) {
      setLangSuggestions(
        getLanguageSuggestionsSync("")
          .filter((s) => isAiGenerationLanguage(s.name))
          .slice(0, 8)
      );
      return;
    }
    setLoadingLang(true);
    getLanguageSuggestions(debouncedLang, 12, true)
      .then((list) =>
        setLangSuggestions(list.filter((s) => isAiGenerationLanguage(s.name)).slice(0, 8))
      )
      .finally(() => setLoadingLang(false));
  }, [debouncedLang]);

  useEffect(() => {
    const trimmed = debouncedRegion.trim();
    if (!trimmed || !geoKey || geoKey === "your_api_key_here") {
      setRegionSuggestions([]);
      return;
    }
    setLoadingRegion(true);
    fetchRegionSuggestions(trimmed, geoKey)
      .then((list) => setRegionSuggestions(list))
      .catch(() => setRegionSuggestions([]))
      .finally(() => setLoadingRegion(false));
  }, [debouncedRegion, geoKey]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangDrop(false);
      }
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setShowRegionDrop(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const syncLocale = (lang: string, reg: string) => {
    onLocaleChange({ language: lang, region: reg });
  };

  const pickLanguage = (name: string) => {
    setLanguage(name);
    syncLocale(name, region);
    setShowLangDrop(false);
  };

  const pickRegion = (formatted: string) => {
    setRegion(formatted);
    syncLocale(language, formatted);
    setShowRegionDrop(false);
  };

  const handleLangKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && langIndex >= 0 && langSuggestions[langIndex]) {
      e.preventDefault();
      pickLanguage(langSuggestions[langIndex].name);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setLangIndex((i) => Math.min(i + 1, langSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLangIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowLangDrop(false);
    }
  };

  const handleRegionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && regionIndex >= 0 && regionSuggestions[regionIndex]) {
      e.preventDefault();
      pickRegion(regionSuggestions[regionIndex].formatted);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setRegionIndex((i) => Math.min(i + 1, regionSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRegionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowRegionDrop(false);
    }
  };

  const handleGenerate = async () => {
    const lang = language.trim();
    const reg = region.trim();
    if (!lang || !reg) {
      setError(UI_STRINGS.SETUP_AI_FIELDS_REQUIRED);
      return;
    }
    if (!isAiGenerationLanguage(lang)) {
      setError(unsupportedHint);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    syncLocale(lang, reg);

    try {
      const { words: miniWords } = await generateWordsMiniFromApi({
        language: lang,
        region: reg,
      });
      if (miniWords.length > 0) {
        setPendingWordsEntry(lang, reg, miniWords);
      }
      addCustomLocale({ language: lang, region: reg });
      saveCustomLanguage(lang);
      saveCustomRegion(reg);

      setPreviewWords(
        miniWords.map((w) => ({ word: w.word, category: w.category }))
      );
      onWordsGenerated?.({
        language: lang,
        region: reg,
        wordCount: miniWords.length,
        phase: "mini",
      });

      setSuccess(UI_STRINGS.SETUP_AI_SUCCESS_QUICK);

      (async () => {
        try {
          const result = await generateWordsFromApi({ language: lang, region: reg });
          if (result.words.length > 0) {
            await addWordsToFirestore(result.words);
            setPendingWordsEntry(lang, reg, result.words);
            setPreviewWords(
              result.words.map((w) => ({ word: w.word, category: w.category }))
            );
            onWordsGenerated?.({
              language: lang,
              region: reg,
              wordCount: result.words.length,
              phase: "full",
            });
            setSuccess(
              UI_STRINGS.SETUP_AI_SUCCESS_FULL.replace("{count}", String(result.words.length))
            );
          }
        } catch (err) {
          console.error("[AI word gen] Background full generation failed:", err);
        }
      })();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Generation failed. Is the word-gen server running? (npm run word-gen-server)"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNicheGenerate = async () => {
    const category = normalizeNicheCategoryName(nicheCategory);
    if (!category) {
      setError(UI_STRINGS.SETUP_AI_NICHE_INVALID);
      return;
    }
    const reg = nicheRegion.trim() || "UK";
    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    syncLocale("English", reg);

    try {
      const result = await generateNicheWordsFromApi({
        category,
        region: reg,
      });
      if (result.words.length > 0) {
        await addWordsToFirestore(result.words);
        setPendingWordsEntry("English", reg, result.words);
        setPreviewWords(
          result.words.map((w) => ({ word: w.word, category: w.category }))
        );
        addCustomLocale({ language: "English", region: reg });
        saveCustomLanguage("English");
        saveCustomRegion(reg);
        onWordsGenerated?.({
          language: "English",
          region: reg,
          wordCount: result.words.length,
          phase: "full",
        });
        setSuccess(
          UI_STRINGS.SETUP_AI_NICHE_SUCCESS.replace("{count}", String(result.words.length)).replace(
            "{category}",
            category
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Generation failed. Is the word-gen server running? (npm run word-gen-server)"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const busy = disabled || isGenerating;

  return (
    <div className={styles.wrap} data-cy="ai-panel">
      <div className={styles.tabs} role="tablist" aria-label="AI generation mode">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "locale"}
          data-cy="ai-tab-locale"
          className={`${styles.tab} ${tab === "locale" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("locale");
            setError(null);
            setSuccess(null);
          }}
          disabled={busy}
        >
          {UI_STRINGS.SETUP_AI_TAB_LOCALE}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "niche"}
          data-cy="ai-tab-niche"
          className={`${styles.tab} ${tab === "niche" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("niche");
            setError(null);
            setSuccess(null);
          }}
          disabled={busy}
        >
          {UI_STRINGS.SETUP_AI_TAB_NICHE}
        </button>
      </div>

      {tab === "locale" ? (
        <>
          <p className={styles.intro}>{UI_STRINGS.SETUP_AI_DESC}</p>

          <LocaleCarousel
            value={locale}
            onChange={(next) => {
              onLocaleChange(next);
              setLanguage(next.language);
              setRegion(next.region);
              setSuccess(null);
            }}
            disabled={busy}
            extraPresets={extraPresets}
            title={UI_STRINGS.SETUP_AI_PRESET_TITLE}
            hint={UI_STRINGS.SETUP_AI_PRESET_HINT}
          />

          <p className={styles.sectionLabel}>{UI_STRINGS.SETUP_AI_OR_NEW}</p>
          <div className={styles.formRow}>
            <div className={styles.field} ref={langRef}>
              <label className={styles.label} htmlFor="ai-language">
                {UI_STRINGS.SETUP_AI_LANGUAGE_LABEL}
              </label>
              <div className={styles.autocomplete}>
                <input
                  id="ai-language"
                  data-cy="ai-language"
                  className={styles.input}
                  value={language}
                  disabled={busy}
                  placeholder={UI_STRINGS.SETUP_AI_LANGUAGE_PLACEHOLDER}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    syncLocale(e.target.value, region);
                    setShowLangDrop(true);
                    setSuccess(null);
                  }}
                  onFocus={() => setShowLangDrop(true)}
                  onKeyDown={handleLangKeyDown}
                  autoComplete="off"
                />
                {showLangDrop && langSuggestions.length > 0 && (
                  <div className={styles.dropdown} role="listbox">
                    {loadingLang && langSuggestions.length === 0 ? (
                      <span className={styles.dropdownItem}>Loading…</span>
                    ) : (
                      langSuggestions.map((s, i) => (
                        <button
                          key={`${s.code}-${s.name}`}
                          type="button"
                          role="option"
                          className={`${styles.dropdownItem} ${i === langIndex ? styles.dropdownItemSelected : ""}`}
                          onClick={() => pickLanguage(s.name)}
                          onMouseEnter={() => setLangIndex(i)}
                        >
                          {s.name}
                          {s.nativeName ? (
                            <span className={styles.dropdownSub}>{s.nativeName}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.field} ref={regionRef}>
              <label className={styles.label} htmlFor="ai-region">
                {UI_STRINGS.SETUP_AI_REGION_LABEL}
              </label>
              <div className={styles.autocomplete}>
                <input
                  id="ai-region"
                  data-cy="ai-region"
                  className={styles.input}
                  value={region}
                  disabled={busy}
                  placeholder={UI_STRINGS.SETUP_AI_REGION_PLACEHOLDER}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    syncLocale(language, e.target.value);
                    setShowRegionDrop(true);
                    setSuccess(null);
                  }}
                  onFocus={() => setShowRegionDrop(true)}
                  onKeyDown={handleRegionKeyDown}
                  autoComplete="off"
                />
                {showRegionDrop && (loadingRegion || regionSuggestions.length > 0) && (
                  <div className={styles.dropdown} role="listbox">
                    {loadingRegion && regionSuggestions.length === 0 ? (
                      <span className={styles.dropdownItem}>Searching…</span>
                    ) : (
                      regionSuggestions.map((s, i) => (
                        <button
                          key={`${s.formatted}-${i}`}
                          type="button"
                          role="option"
                          className={`${styles.dropdownItem} ${i === regionIndex ? styles.dropdownItemSelected : ""}`}
                          onClick={() => pickRegion(s.formatted)}
                          onMouseEnter={() => setRegionIndex(i)}
                        >
                          {s.formatted}
                          {s.properties.state ? (
                            <span className={styles.dropdownSub}>
                              {s.properties.state}, {s.properties.country}
                            </span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className={styles.note}>{UI_STRINGS.SETUP_AI_NOTE}</p>
          {language.trim() && !languageSupported && (
            <p className={styles.error} role="status" data-cy="ai-unsupported-language">
              {unsupportedHint}
            </p>
          )}

          <button
            type="button"
            className={styles.generateBtn}
            data-cy="ai-generate"
            onClick={handleGenerate}
            disabled={
              busy || !language.trim() || !region.trim() || !languageSupported
            }
            aria-label={UI_STRINGS.SETUP_AI_GENERATE}
          >
            {isGenerating ? (
              <>
                <Loader2 size={22} className={styles.generateBtnIcon} aria-hidden />
                {UI_STRINGS.SETUP_AI_GENERATING}
              </>
            ) : (
              <>
                <Sparkles size={22} className={styles.generateBtnIcon} aria-hidden />
                {UI_STRINGS.SETUP_AI_GENERATE}
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <p className={styles.intro}>{UI_STRINGS.SETUP_AI_NICHE_DESC}</p>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ai-niche-category">
                {UI_STRINGS.SETUP_AI_NICHE_LABEL}
              </label>
              <input
                id="ai-niche-category"
                data-cy="ai-niche-category"
                className={styles.input}
                value={nicheCategory}
                disabled={busy}
                placeholder={UI_STRINGS.SETUP_AI_NICHE_PLACEHOLDER}
                onChange={(e) => {
                  setNicheCategory(e.target.value);
                  setSuccess(null);
                }}
                autoComplete="off"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ai-niche-region">
                {UI_STRINGS.SETUP_AI_NICHE_REGION_LABEL}
              </label>
              <input
                id="ai-niche-region"
                className={styles.input}
                value={nicheRegion}
                disabled={busy}
                placeholder="UK"
                onChange={(e) => setNicheRegion(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <p className={styles.note}>{UI_STRINGS.SETUP_AI_NOTE}</p>
          <button
            type="button"
            className={styles.generateBtn}
            data-cy="ai-niche-generate"
            onClick={handleNicheGenerate}
            disabled={busy || !nicheCategory.trim()}
            aria-label={UI_STRINGS.SETUP_AI_NICHE_GENERATE}
          >
            {isGenerating ? (
              <>
                <Loader2 size={22} className={styles.generateBtnIcon} aria-hidden />
                {UI_STRINGS.SETUP_AI_GENERATING}
              </>
            ) : (
              <>
                <Sparkles size={22} className={styles.generateBtnIcon} aria-hidden />
                {UI_STRINGS.SETUP_AI_NICHE_GENERATE}
              </>
            )}
          </button>
        </>
      )}

      {error && (
        <p className={styles.error} role="alert" data-cy="ai-error">
          {error}
        </p>
      )}
      {success && (
        <p className={styles.success} role="status" data-cy="ai-success">
          {success}
          <br />
          <span className={styles.successHint}>{UI_STRINGS.SETUP_AI_GO_TOPICS}</span>
        </p>
      )}

      {previewWords.length > 0 && (
        <details className={styles.preview} data-cy="ai-preview">
          <summary>
            {UI_STRINGS.SETUP_AI_PREVIEW_WORDS} ({previewWords.length})
          </summary>
          <ul className={styles.previewList}>
            {previewWords.map((w, i) => (
              <li key={`${w.category}-${w.word}-${i}`}>
                <strong>{w.word}</strong>
                <span className={styles.previewCat}>{w.category}</span>
              </li>
            ))}
          </ul>
          <p className={styles.previewNote}>{UI_STRINGS.SETUP_AI_PREVIEW_NOTE}</p>
        </details>
      )}

      {tab === "locale" && onStartRandom && (
        <button
          type="button"
          className={styles.playBtn}
          onClick={onStartRandom}
          disabled={busy || startBusy || !language.trim() || !region.trim()}
        >
          {startBusy ? UI_STRINGS.SETUP_STARTING : UI_STRINGS.SETUP_AI_PLAY_RANDOM}
        </button>
      )}
    </div>
  );
}
