import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dices,
  LayoutGrid,
  Minus,
  Plus,
  Sparkles,
  Users,
  Shield,
  Loader2,
} from "lucide-react";
import styles from "./PlayerCountSelect.module.css";
import LobbyShell, { lobbyStyles as ls } from "./layout/LobbyShell";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, ROUTES, GAME_NAME } from "../constants/strings";
import { fetchCategoryCountsForLocale } from "../services/wordsService";
import { computeMafiaCount } from "../utils/mafiaCount";
import {
  addCustomLocale,
  customLocalesToPresets,
  discoverCustomLocales,
  syncDiscoveredLocalesToStorage,
} from "../utils/customLocales";
import LocaleCarousel from "./setup/LocaleCarousel";
import CategoryCarousel from "./setup/CategoryCarousel";
import AiWordGenPanel from "./setup/AiWordGenPanel";
import type { LocaleValue } from "./setup/LocalePicker.types";
import type { LocalePreset } from "../constants/localePresets";
import { LOCALE_PRESETS } from "../constants/localePresets";
import {
  categoriesForLocale,
  isEnglishLanguage,
} from "../constants/categories";

type SetupMode = "random" | "custom" | "ai";

export default function PlayerCountSelect() {
  const navigate = useNavigate();
  const { startGame, isLoadingWords } = useGame();
  const [players, setPlayers] = useState(6);
  const [mode, setMode] = useState<SetupMode>("random");
  const [locale, setLocale] = useState<LocaleValue>(() => ({
    language: LOCALE_PRESETS[0].language,
    region: LOCALE_PRESETS[0].region,
  }));
  const [extraPresets, setExtraPresets] = useState<LocalePreset[]>(() =>
    customLocalesToPresets(discoverCustomLocales())
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [localeDataVersion, setLocaleDataVersion] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const mafiaCount = useMemo(() => computeMafiaCount(players), [players]);

  const refreshExtraPresets = useCallback(() => {
    syncDiscoveredLocalesToStorage();
    setExtraPresets(customLocalesToPresets(discoverCustomLocales()));
  }, []);

  useEffect(() => {
    syncDiscoveredLocalesToStorage();
    setExtraPresets(customLocalesToPresets(discoverCustomLocales()));
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshExtraPresets();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshExtraPresets]);

  const loadRequestRef = useRef(0);

  const loadCategoriesForLocale = useCallback(
    async (lang: string, reg: string) => {
      if (!lang || !reg) {
        setAvailableCategories([]);
        setCategoryCounts({});
        return;
      }

      const requestId = ++loadRequestRef.current;
      setLoadingCategories(true);
      setAvailableCategories([]);
      setCategoryCounts({});

      try {
        const counts = await fetchCategoryCountsForLocale(lang, reg);
        if (requestId !== loadRequestRef.current) return;

        setCategoryCounts(counts);
        const available = Object.entries(counts)
          .filter(([, c]) => c > 0)
          .map(([cat]) => cat)
          .sort();
        setAvailableCategories(available);
        setSelectedCategories((prev) => prev.filter((c) => available.includes(c)));
      } catch {
        if (requestId !== loadRequestRef.current) return;
        setAvailableCategories([]);
        setCategoryCounts({});
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoadingCategories(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (mode !== "custom") return;
    const lang = locale.language.trim();
    const reg = locale.region.trim();
    loadCategoriesForLocale(lang, reg);
  }, [mode, locale.language, locale.region, localeDataVersion, loadCategoriesForLocale]);

  const handleWordsGenerated = useCallback(
    (event: { language: string; region: string; phase: "mini" | "full" }) => {
      addCustomLocale({ language: event.language, region: event.region });
      refreshExtraPresets();
      setLocale({ language: event.language, region: event.region });
      setLocaleDataVersion((v) => v + 1);
      if (event.phase === "mini") {
        setMode("custom");
      }
    },
    [refreshExtraPresets]
  );

  const bumpPlayers = (delta: number) => {
    setPlayers((p) => Math.min(25, Math.max(2, p + delta)));
  };

  const runStart = async (
    categories?: string[],
    languages?: string[],
    regions?: string[]
  ) => {
    setStartError(null);
    setIsStarting(true);
    try {
      await startGame(players, categories, languages, regions);
      navigate(ROUTES.GAME);
    } catch {
      setStartError("Could not start the game. Check your connection and try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const onStartRandom = async () => {
    const lang = locale.language.trim();
    const reg = locale.region.trim();
    if (!lang || !reg) {
      setStartError(UI_STRINGS.SETUP_LOCALE_REQUIRED);
      return;
    }
    // Non-English: only sample culture-rich categories (avoid leftover universal glosses).
    const cats = isEnglishLanguage(lang)
      ? undefined
      : [...categoriesForLocale(lang)];
    await runStart(cats, [lang], [reg]);
  };

  const onStartCustom = async () => {
    if (selectedCategories.length === 0) {
      setStartError(UI_STRINGS.SETUP_CATEGORIES_REQUIRED);
      return;
    }
    const lang = locale.language.trim();
    const reg = locale.region.trim();
    if (!lang || !reg) {
      setStartError(UI_STRINGS.SETUP_LOCALE_REQUIRED);
      return;
    }
    await runStart(selectedCategories, [lang], [reg]);
  };

  const busy = isStarting || isLoadingWords;

  return (
    <LobbyShell
      badge={UI_STRINGS.SETUP_BADGE}
      title={GAME_NAME}
      subtitle={UI_STRINGS.SETUP_SUBTITLE}
      wide
    >
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <Users size={18} aria-hidden />
          <span>
            <strong data-cy="player-count">{players}</strong> {UI_STRINGS.SETUP_PLAYERS_SHORT}
          </span>
        </div>
        <div className={styles.stat}>
          <Shield size={18} aria-hidden />
          <span>
            <strong data-cy="mafia-count">{mafiaCount}</strong>{" "}
            {mafiaCount === 1 ? "Mafia" : "Mafia players"}
          </span>
        </div>
      </div>

      <div className={styles.playerControl}>
        <span className={styles.playerLabel}>{UI_STRINGS.SETUP_SELECT_PLAYERS}</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperBtn}
            data-cy="player-decrement"
            onClick={() => bumpPlayers(-1)}
            disabled={players <= 2 || busy}
            aria-label="Fewer players"
          >
            <Minus size={18} />
          </button>
          <span className={styles.playerValue}>{players}</span>
          <button
            type="button"
            className={styles.stepperBtn}
            data-cy="player-increment"
            onClick={() => bumpPlayers(1)}
            disabled={players >= 25 || busy}
            aria-label="More players"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className={styles.modeTabsLayout} role="tablist" aria-label="How to choose words">
        <div className={styles.modeTabsRow}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "random"}
            data-cy="mode-random"
            className={`${styles.modeTab} ${mode === "random" ? styles.modeTabActive : ""}`}
            onClick={() => {
              setMode("random");
              setStartError(null);
            }}
          >
            <Dices size={18} aria-hidden />
            {UI_STRINGS.SETUP_MODE_RANDOM}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "custom"}
            data-cy="mode-custom"
            className={`${styles.modeTab} ${mode === "custom" ? styles.modeTabActive : ""}`}
            onClick={() => {
              setMode("custom");
              setStartError(null);
            }}
          >
            <LayoutGrid size={18} aria-hidden />
            {UI_STRINGS.SETUP_MODE_CUSTOM}
          </button>
        </div>
        <div className={styles.modeTabsRowAi}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ai"}
            data-cy="mode-ai"
            className={`${styles.modeTab} ${styles.modeTabAi} ${mode === "ai" ? styles.modeTabActive : ""}`}
            onClick={() => {
              setMode("ai");
              setStartError(null);
            }}
          >
            <span className={styles.modeTabAiIcon} aria-hidden>
              <Sparkles size={18} strokeWidth={2.25} />
            </span>
            {UI_STRINGS.SETUP_MODE_AI}
          </button>
        </div>
      </div>

      {mode === "random" && (
        <div className={styles.modePanel}>
          <p className={styles.panelDesc}>{UI_STRINGS.SETUP_RANDOM_DESC}</p>
          <LocaleCarousel
            value={locale}
            onChange={setLocale}
            disabled={busy}
            extraPresets={extraPresets}
            hint={UI_STRINGS.SETUP_RANDOM_LOCALE_HINT}
          />
          <button
            type="button"
            className={ls.ctaPrimary}
            data-cy="start-random"
            onClick={onStartRandom}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 size={20} className={ls.spin} aria-hidden />
                {UI_STRINGS.SETUP_STARTING}
              </>
            ) : (
              <>
                <Dices size={20} aria-hidden />
                {UI_STRINGS.SETUP_START_RANDOM}
              </>
            )}
          </button>
        </div>
      )}

      {mode === "custom" && (
        <div className={styles.modePanel}>
          <LocaleCarousel
            value={locale}
            onChange={(next) => {
              setLocale(next);
              setSelectedCategories([]);
            }}
            disabled={busy}
            extraPresets={extraPresets}
            title={UI_STRINGS.SETUP_LANGUAGE_REGION}
            hint={UI_STRINGS.SETUP_LOCALE_FIRST_HINT}
          />

          {loadingCategories && (
            <p className={styles.loadingHint} data-cy="categories-loading">
              <Loader2 size={16} className={ls.spin} aria-hidden />
              {UI_STRINGS.SETUP_LOADING_CATEGORIES}
            </p>
          )}

          {!loadingCategories && availableCategories.length === 0 && (
            <p className={styles.emptyHint} data-cy="empty-pool">
              {UI_STRINGS.SETUP_NO_CATEGORIES}
            </p>
          )}

          {availableCategories.length > 0 && (
            <CategoryCarousel
              categories={availableCategories}
              wordCounts={categoryCounts}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              disabled={busy || loadingCategories}
              title={UI_STRINGS.SETUP_WORD_THEME}
              hint={
                availableCategories.length > 2
                  ? `${UI_STRINGS.SETUP_CATEGORIES_DESCRIPTION} ${UI_STRINGS.SETUP_SCROLL_CAROUSEL_HINT}`
                  : UI_STRINGS.SETUP_CATEGORIES_DESCRIPTION
              }
            />
          )}

          <button
            type="button"
            className={ls.ctaPrimary}
            data-cy="start-custom"
            onClick={onStartCustom}
            disabled={
              busy || selectedCategories.length === 0 || availableCategories.length === 0
            }
          >
            {busy ? (
              <>
                <Loader2 size={20} className={ls.spin} aria-hidden />
                {UI_STRINGS.SETUP_STARTING}
              </>
            ) : (
              UI_STRINGS.SETUP_START_CUSTOM
            )}
          </button>
        </div>
      )}

      {mode === "ai" && (
        <AiWordGenPanel
          locale={locale}
          onLocaleChange={setLocale}
          disabled={busy}
          onStartRandom={onStartRandom}
          startBusy={isStarting}
          onWordsGenerated={handleWordsGenerated}
          extraPresets={extraPresets}
        />
      )}

      {startError && (
        <p className={ls.error} role="alert" data-cy="setup-error">
          {startError}
        </p>
      )}
    </LobbyShell>
  );
}
