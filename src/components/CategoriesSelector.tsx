import React, { useEffect, useState, useRef, useMemo } from "react";
import styles from "./CategoriesSelector.module.css";
import { useDebounce } from "../hooks/useDebounce";
import { fetchRegionSuggestions, type GeoapifySuggestion } from "../services/geoapify";
import { getLanguageSuggestions, getLanguageSuggestionsSync, type LanguageSuggestion } from "../services/languageAutocomplete";
import { ALL_CATEGORIES } from "../constants/categories";
import { EXISTING_LANGUAGES, EXISTING_REGIONS } from "../constants/existingLanguageRegion";

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
  initialItems?: FilterItem[]; // optional if you later hydrate from store
  onChangeSelected?: (selected: SelectedFilters) => void;
};

const defaultBaseCategories = [...ALL_CATEGORIES];

export default function CategoriesSelector({
  baseCategories = defaultBaseCategories,
  initialItems,
  onChangeSelected,
}: Props) {
  const defaultPlayItems: FilterItem[] = [
    ...baseCategories.map((label, idx) => ({
      id: `cat_${idx}`,
      label,
      type: "category" as const,
      checked: true,
      isCustom: false,
    })),
    ...EXISTING_LANGUAGES.map((label, idx) => ({
      id: `lang_${idx}`,
      label,
      type: "language" as const,
      checked: false,
      isCustom: false,
    })),
    ...EXISTING_REGIONS.map((label, idx) => ({
      id: `region_${idx}`,
      label,
      type: "region" as const,
      checked: false,
      isCustom: false,
    })),
  ];

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
                    placeholder="e.g. Punjab, Toronto, UK..."
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
          <button type="button" className={styles.missingActionButton} disabled aria-disabled="true">
            Generate words
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
