import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategoriesSelector.module.css";
import { useDebounce } from "../hooks/useDebounce";
import { fetchRegionSuggestions, type GeoapifySuggestion } from "../services/geoapify";
import { getLanguageSuggestions, getLanguageSuggestionsSync, type LanguageSuggestion } from "../services/languageAutocomplete";
import { generateWordsFromApi, generateWordsMiniFromApi } from "../services/wordGenerationService";
import { addWordsToFirestore, setPendingWordsEntry } from "../services/wordsService";
import { ALL_CATEGORIES, AI_GENERATION_LANGUAGES, isAiGenerationLanguage } from "../constants/categories";
import { EXISTING_LANGUAGES, EXISTING_REGIONS } from "../constants/existingLanguageRegion";
import { ROUTES } from "../constants/strings";

const CUSTOM_LANGS_KEY = "wordgame_custom_languages";
const CUSTOM_REGIONS_KEY = "wordgame_custom_regions";

function loadCustomLanguages(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LANGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadCustomRegions(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_REGIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomLanguage(lang: string) {
  const set = new Set([...loadCustomLanguages(), lang]);
  localStorage.setItem(CUSTOM_LANGS_KEY, JSON.stringify([...set]));
}

function saveCustomRegion(region: string) {
  const set = new Set([...loadCustomRegions(), region]);
  localStorage.setItem(CUSTOM_REGIONS_KEY, JSON.stringify([...set]));
}

export type FilterItemType = "category" | "language" | "region";

export type FilterItem = {
  id: string;
  label: string;
  type: FilterItemType;
  checked: boolean;
  isCustom: boolean;
};

export type SelectedFilters = {
  categories: string[];
  languages: string[];
  regions: string[];
};

type Props = {
  baseCategories?: string[];
  initialItems?: FilterItem[];
  /** When false (default), no categories are pre-selected — user must choose explicitly. */
  defaultCategoriesChecked?: boolean;
  onChangeSelected?: (selected: SelectedFilters) => void;
};

const defaultBaseCategories = [...ALL_CATEGORIES];

export default function CategoriesSelector({
  baseCategories = defaultBaseCategories,
  initialItems,
  defaultCategoriesChecked = false,
  onChangeSelected,
}: Props) {
  const navigate = useNavigate();
  const customLangs = useMemo(() => loadCustomLanguages(), []);
  const customRegions = useMemo(() => loadCustomRegions(), []);

  const defaultPlayItems: FilterItem[] = useMemo(
    () => [
      ...baseCategories.map((label, idx) => ({
        id: `cat_${idx}`,
        label,
        type: "category" as const,
        checked: defaultCategoriesChecked,
        isCustom: false,
      })),
      ...EXISTING_LANGUAGES.map((label, idx) => ({
        id: `lang_${idx}`,
        label,
        type: "language" as const,
        checked: false,
        isCustom: false,
      })),
      ...customLangs
        .filter((l) => !EXISTING_LANGUAGES.map((x) => x.toLowerCase()).includes(l.toLowerCase()))
        .map((label, idx) => ({
          id: `lang_custom_${idx}_${label}`,
          label,
          type: "language" as const,
          checked: false,
          isCustom: true,
        })),
      ...EXISTING_REGIONS.map((label, idx) => ({
        id: `region_${idx}`,
        label,
        type: "region" as const,
        checked: false,
        isCustom: false,
      })),
      ...customRegions
        .filter((r) => !EXISTING_REGIONS.map((x) => x.toLowerCase()).includes(r.toLowerCase()))
        .map((label, idx) => ({
          id: `region_custom_${idx}_${label}`,
          label,
          type: "region" as const,
          checked: false,
          isCustom: true,
        })),
    ],
    [baseCategories, customLangs, customRegions, defaultCategoriesChecked]
  );

  const [items, setItems] = useState<FilterItem[]>(initialItems ?? defaultPlayItems);

  const [showMissingCombinations, setShowMissingCombinations] = useState(false);

  // AI form (separate): original autocomplete inputs
  const [aiLanguageInput, setAiLanguageInput] = useState("");
  const [aiRegionInput, setAiRegionInput] = useState("");
  const [aiLanguageSuggestions, setAiLanguageSuggestions] = useState<LanguageSuggestion[]>([]);
  const [aiRegionSuggestions, setAiRegionSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [showAiLanguageSuggestions, setShowAiLanguageSuggestions] = useState(false);
  const [showAiRegionSuggestions, setShowAiRegionSuggestions] = useState(false);
  const [selectedAiLanguageIndex, setSelectedAiLanguageIndex] = useState(-1);
  const [selectedAiRegionIndex, setSelectedAiRegionIndex] = useState(-1);
  const [isLoadingAiRegions, setIsLoadingAiRegions] = useState(false);
  const [isLoadingAiLanguages, setIsLoadingAiLanguages] = useState(false);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const aiLanguageInputRef = useRef<HTMLInputElement>(null);
  const aiRegionInputRef = useRef<HTMLInputElement>(null);
  const aiLanguageDropdownRef = useRef<HTMLDivElement>(null);
  const aiRegionDropdownRef = useRef<HTMLDivElement>(null);

  const aiDebouncedLanguageInput = useDebounce(aiLanguageInput, 200);
  const aiDebouncedRegionInput = useDebounce(aiRegionInput, 300);

  const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

  // AI form: fetch language suggestions
  useEffect(() => {
    if (!aiDebouncedLanguageInput.trim()) {
      setAiLanguageSuggestions([]);
      setShowAiLanguageSuggestions(false);
      setIsLoadingAiLanguages(false);
      return;
    }
    const instantSuggestions = getLanguageSuggestionsSync(aiDebouncedLanguageInput, 8);
    setAiLanguageSuggestions(instantSuggestions);
    setShowAiLanguageSuggestions(instantSuggestions.length > 0);
    setSelectedAiLanguageIndex(-1);
    setIsLoadingAiLanguages(true);
    getLanguageSuggestions(aiDebouncedLanguageInput, 8, true)
      .then((apiSuggestions) => {
        if (aiDebouncedLanguageInput.trim()) {
          setAiLanguageSuggestions(apiSuggestions);
          setShowAiLanguageSuggestions(apiSuggestions.length > 0);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingAiLanguages(false));
  }, [aiDebouncedLanguageInput]);

  // AI form: fetch region suggestions
  useEffect(() => {
    const trimmed = aiDebouncedRegionInput.trim();
    if (!trimmed) {
      setAiRegionSuggestions([]);
      setShowAiRegionSuggestions(false);
      setIsLoadingAiRegions(false);
      return;
    }
    if (!geoapifyApiKey || geoapifyApiKey === "your_api_key_here") {
      setAiRegionSuggestions([]);
      setShowAiRegionSuggestions(false);
      setIsLoadingAiRegions(false);
      return;
    }
    setIsLoadingAiRegions(true);
    fetchRegionSuggestions(trimmed, geoapifyApiKey)
      .then((suggestions) => {
        setAiRegionSuggestions(suggestions);
        setShowAiRegionSuggestions(suggestions.length > 0);
        setSelectedAiRegionIndex(-1);
      })
      .catch(() => {
        setAiRegionSuggestions([]);
        setShowAiRegionSuggestions(false);
      })
      .finally(() => setIsLoadingAiRegions(false));
  }, [aiDebouncedRegionInput, geoapifyApiKey]);

  // Close AI dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aiLanguageDropdownRef.current &&
        !aiLanguageDropdownRef.current.contains(event.target as Node) &&
        aiLanguageInputRef.current &&
        !aiLanguageInputRef.current.contains(event.target as Node)
      ) {
        setShowAiLanguageSuggestions(false);
      }
      if (
        aiRegionDropdownRef.current &&
        !aiRegionDropdownRef.current.contains(event.target as Node) &&
        aiRegionInputRef.current &&
        !aiRegionInputRef.current.contains(event.target as Node)
      ) {
        setShowAiRegionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute selected filters (memoized to prevent unnecessary recalculations)
  const selected = useMemo<SelectedFilters>(() => ({
      categories: items
        .filter((i) => i.type === "category" && i.checked)
        .map((i) => i.label),
      languages: items
        .filter((i) => i.type === "language" && i.checked)
        .map((i) => i.label),
      regions: items
        .filter((i) => i.type === "region" && i.checked)
        .map((i) => i.label),
  }), [items]);

  // Emit selection upwards (only when selected values actually change)
  useEffect(() => {
    if (!onChangeSelected) return;
    onChangeSelected(selected);
  }, [selected, onChangeSelected]);

  const handleAiLanguageSelect = (name: string) => {
    setAiLanguageInput(name);
    setShowAiLanguageSuggestions(false);
    setAiLanguageSuggestions([]);
  };

  const handleAiRegionSelect = (formatted: string) => {
    setAiRegionInput(formatted);
    setShowAiRegionSuggestions(false);
    setAiRegionSuggestions([]);
  };

  const handleAiKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "language" | "region"
  ) => {
    if (type === "language") {
      if (e.key === "Enter" && selectedAiLanguageIndex >= 0 && aiLanguageSuggestions[selectedAiLanguageIndex]) {
        e.preventDefault();
        handleAiLanguageSelect(aiLanguageSuggestions[selectedAiLanguageIndex].name);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAiLanguageIndex((prev) =>
          prev < aiLanguageSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAiLanguageIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setShowAiLanguageSuggestions(false);
        setAiLanguageInput("");
      }
    } else {
      if (e.key === "Enter" && selectedAiRegionIndex >= 0 && aiRegionSuggestions[selectedAiRegionIndex]) {
        e.preventDefault();
        handleAiRegionSelect(aiRegionSuggestions[selectedAiRegionIndex].formatted);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAiRegionIndex((prev) =>
          prev < aiRegionSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAiRegionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setShowAiRegionSuggestions(false);
        setAiRegionInput("");
      }
    }
  };

  const toggleChecked = (id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, checked: !it.checked } : it
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleGenerateWords = async () => {
    const language = aiLanguageInput.trim();
    const region = aiRegionInput.trim();
    if (!language || !region) {
      setGenerateError("Please enter both language and region.");
      return;
    }
    if (!isAiGenerationLanguage(language)) {
      setGenerateError(
        `AI generation supports: ${AI_GENERATION_LANGUAGES.join(", ")}. Other languages are not enabled yet.`
      );
      return;
    }

    setGenerateError(null);
    setGenerateSuccess(false);
    setIsGeneratingWords(true);

    try {
      const { words: miniWords } = await generateWordsMiniFromApi({ language, region });
      if (miniWords.length > 0) {
        setPendingWordsEntry(language, region, miniWords);
      }
      saveCustomLanguage(language);
      saveCustomRegion(region);

      const hasLang = items.some(
        (i) => i.type === "language" && i.label.toLowerCase() === language.toLowerCase()
      );
      const hasRegion = items.some(
        (i) => i.type === "region" && i.label.toLowerCase() === region.toLowerCase()
      );
      setItems((prev) => {
        let next = [...prev];
        if (!hasLang) {
          next = [
            ...next,
            {
              id: `lang_custom_${language}`,
              label: language,
              type: "language" as const,
              checked: false,
              isCustom: true,
            },
          ];
        }
        if (!hasRegion) {
          next = [
            ...next,
            {
              id: `region_custom_${region}`,
              label: region,
              type: "region" as const,
              checked: false,
              isCustom: true,
            },
          ];
        }
        return next;
      });

      setGenerateSuccess(true);
      setShowMissingCombinations(false);
      setIsGeneratingWords(false);
      navigate(ROUTES.SETUP);

      (async () => {
        console.time("[AI word gen] Full generation (AI + network)");
        let words: import("../services/wordsService").WordDocumentLike[] = [];
        try {
          const result = await generateWordsFromApi({ language, region });
          words = result.words;
        } finally {
          console.timeEnd("[AI word gen] Full generation (AI + network)");
        }
        if (words.length > 0) {
          const t0 = performance.now();
          await addWordsToFirestore(words);
          setPendingWordsEntry(language, region, words);
          const firebaseMs = performance.now() - t0;
          console.log(
            "[AI word gen] Full generation completed:",
            words.length,
            "words. Firebase seed:",
            firebaseMs.toFixed(0),
            "ms. Sample:",
            words.slice(0, 20).map((w) => w.word)
          );
        }
      })().catch((err) => {
        console.error("[AI word gen] Background full generation failed:", err);
      });
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Generation failed. Is the word-gen server running?"
      );
      setIsGeneratingWords(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.subtext}>
        Choose categories, then pick <b>languages</b> and <b>regions</b> you have word data for. You can only play with existing language–region combinations.
      </p>

      <div className={styles.selectedHeader}>
        <span className={styles.selectedTitle}>Your active filters</span>
        <span className={styles.selectedHint}>
          Click to toggle.
        </span>
      </div>

      <button
        type="button"
        className={styles.generateWordsButton}
        onClick={() => setShowMissingCombinations((prev) => !prev)}
        aria-expanded={showMissingCombinations}
      >
        Generate culture-rich words (AI)
      </button>

      {showMissingCombinations && (
        <div className={styles.missingCombinationsBox} role="region" aria-label="AI word generation">
          <p className={styles.missingCombinationsAsk}>
            <strong>Want niche or dialect-specific words?</strong> Add a language and region below and generate culture-rich words.
          </p>
          <div className={styles.aiFormRow}>
            <div className={styles.inputBlock}>
              <label className={styles.label}>Language</label>
              <div className={styles.autocompleteWrapper}>
                <div className={styles.inputWrap}>
                  <input
                    ref={aiLanguageInputRef}
                    className={styles.input}
                    placeholder="e.g. Punjabi, Hindi, Spanish..."
                    value={aiLanguageInput}
                    onChange={(e) => {
                      setAiLanguageInput(e.target.value);
                      setShowAiLanguageSuggestions(true);
                    }}
                    onKeyDown={(e) => handleAiKeyDown(e, "language")}
                    onFocus={() => aiLanguageSuggestions.length > 0 && setShowAiLanguageSuggestions(true)}
                  />
                </div>
                {isLoadingAiLanguages && aiLanguageSuggestions.length === 0 && (
                  <div className={styles.suggestionsDropdown}>
                    <div className={styles.suggestionItem}>Loading...</div>
                  </div>
                )}
                {showAiLanguageSuggestions && aiLanguageSuggestions.length > 0 && (
                  <div ref={aiLanguageDropdownRef} className={styles.suggestionsDropdown}>
                    {aiLanguageSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.code}-${index}`}
                        type="button"
                        className={`${styles.suggestionItem} ${index === selectedAiLanguageIndex ? styles.suggestionItemSelected : ""}`}
                        onClick={() => handleAiLanguageSelect(suggestion.name)}
                        onMouseEnter={() => setSelectedAiLanguageIndex(index)}
                      >
                        <span className={styles.suggestionMain}>{suggestion.name}</span>
                        {suggestion.nativeName && (
                          <span className={styles.suggestionSub}>{suggestion.nativeName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.inputBlock}>
              <label className={styles.label}>Region</label>
              <div className={styles.autocompleteWrapper}>
                <div className={styles.inputWrap}>
                  <input
                    ref={aiRegionInputRef}
                    className={styles.input}
                    placeholder="e.g. Punjab, Toronto..."
                    value={aiRegionInput}
                    onChange={(e) => {
                      setAiRegionInput(e.target.value);
                      setShowAiRegionSuggestions(true);
                    }}
                    onKeyDown={(e) => handleAiKeyDown(e, "region")}
                    onFocus={() => aiRegionSuggestions.length > 0 && setShowAiRegionSuggestions(true)}
                  />
                </div>
                {isLoadingAiRegions && aiRegionSuggestions.length === 0 && (
                  <div className={styles.suggestionsDropdown}>
                    <div className={styles.suggestionItem}>Loading...</div>
                  </div>
                )}
                {showAiRegionSuggestions && !isLoadingAiRegions && aiRegionSuggestions.length > 0 && (
                  <div ref={aiRegionDropdownRef} className={styles.suggestionsDropdown}>
                    {aiRegionSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.formatted}-${index}`}
                        type="button"
                        className={`${styles.suggestionItem} ${index === selectedAiRegionIndex ? styles.suggestionItemSelected : ""}`}
                        onClick={() => handleAiRegionSelect(suggestion.formatted)}
                        onMouseEnter={() => setSelectedAiRegionIndex(index)}
                      >
                        <span className={styles.suggestionMain}>{suggestion.formatted}</span>
                        {suggestion.properties.state && (
                          <span className={styles.suggestionSub}>
                            {suggestion.properties.state}, {suggestion.properties.country}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {generateError && (
            <p className={styles.generateError} role="alert">
              {generateError}
            </p>
          )}
          {generateSuccess && (
            <p className={styles.generateSuccess} role="status">
              New words added successfully. Redirecting to categories…
            </p>
          )}
          <button
            type="button"
            className={styles.missingActionButton}
            onClick={handleGenerateWords}
            disabled={
              !aiLanguageInput.trim() ||
              !aiRegionInput.trim() ||
              isGeneratingWords
            }
          >
            {isGeneratingWords ? "Generating…" : "Generate words"}
          </button>
        </div>
      )}

      <div className={styles.chipsWrap}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.chip} ${
              item.checked ? styles.chipActive : styles.chipInactive
            }`}
          >
            <button
              type="button"
              className={styles.chipMain}
              onClick={() => toggleChecked(item.id)}
            >
              <span
                className={`${styles.checkbox} ${
                  item.checked ? styles.checkboxChecked : ""
                }`}
              />
              <span className={styles.chipLabel}>
                {item.label}
                <span className={styles.chipTag}>
                  {item.type === "category"
                    ? "Category"
                    : item.type === "language"
                    ? "Language"
                    : "Region"}
                </span>
              </span>
            </button>

            {item.isCustom && (
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
