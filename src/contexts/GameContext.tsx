import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { words as allWords } from "../assets/words"; // Fallback
import { STORAGE_KEYS } from "../constants/strings";
import { fetchWords, type WordDocument, type WordFilters } from "../services/wordsService";
import { computeMafiaCount } from "../utils/mafiaCount";
import { pickOne, shuffle } from "../utils/random";
import { gameRandom } from "../utils/testHooks";

export interface GameState {
  players: number;
  categoryName: string | null;
  word: string | null;
  wordError?: string | null;
  wordLanguage?: string | null; // language[0] of chosen word
  wordRegion?: string | null;   // region[0] / origin of chosen word
  /** Player numbers (1-based) who are mafia */
  mafiaIds: number[];
  revealedIds: number[]; // store as array for serialization
  selectedCategories: string[]; // selected categories for word selection
  selectedLanguages?: string[]; // selected languages for word selection
  selectedRegions?: string[]; // selected regions for word selection
}

export interface GameContextType extends GameState {
  startGame: (
    players: number, 
    selectedCategories?: string[], 
    selectedLanguages?: string[],
    selectedRegions?: string[]
  ) => Promise<void>;
  pickCategoryAndWord: (
    selectedCategories?: string[], 
    selectedLanguages?: string[],
    selectedRegions?: string[]
  ) => Promise<{ categoryName: string | null; word: string | null; wordLanguage?: string | null; wordRegion?: string | null; error?: string | null }>;
  markRevealed: (playerId: number) => void;
  resetGame: () => void;
  isLoadingWords: boolean;
}

const DEFAULT_STATE: GameState = {
  players: 0,
  categoryName: null,
  word: null,
  wordError: null,
  mafiaIds: [],
  revealedIds: [],
  selectedCategories: [],
  selectedLanguages: [],
  selectedRegions: [],
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.GAME_STATE);
      if (raw) {
        const parsed = JSON.parse(raw) as any;
        // Migrate old imposterId to mafiaId if needed
        if ("imposterId" in parsed && !("mafiaId" in parsed) && !("mafiaIds" in parsed)) {
          parsed.mafiaId = parsed.imposterId;
          delete parsed.imposterId;
        }
        const migratedMafiaIds: number[] = Array.isArray(parsed.mafiaIds)
          ? parsed.mafiaIds.filter((x: unknown) => typeof x === "number")
          : parsed.mafiaId != null
            ? [Number(parsed.mafiaId)]
            : [];
        // Ensure all required fields exist
        return {
          players: parsed.players || 0,
          categoryName: parsed.categoryName || null,
          word: parsed.word || null,
          wordLanguage: parsed.wordLanguage ?? null,
          wordRegion: parsed.wordRegion ?? null,
          mafiaIds: migratedMafiaIds,
          revealedIds: parsed.revealedIds || [],
          selectedCategories: parsed.selectedCategories || [],
          selectedLanguages: parsed.selectedLanguages || [],
          selectedRegions: parsed.selectedRegions || [],
        } as GameState;
      }
      return DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  const [isLoadingWords, setIsLoadingWords] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  }, [state]);

  const pickCategoryAndWord = async (
    selectedCategories?: string[],
    selectedLanguages?: string[],
    selectedRegions?: string[]
  ): Promise<{ categoryName: string | null; word: string | null; wordLanguage?: string | null; wordRegion?: string | null; error?: string | null }> => {
    setIsLoadingWords(true);
    try {
      // Build filters for Firebase query
      const filters: WordFilters = {};
      
      if (selectedCategories && selectedCategories.length > 0) {
        filters.categories = selectedCategories;
      }
      
      if (selectedLanguages && selectedLanguages.length > 0) {
        filters.languages = selectedLanguages;
      }
      
      if (selectedRegions && selectedRegions.length > 0) {
        filters.regions = selectedRegions;
      }

      console.log("🎮 Picking word with filters:", {
        categories: selectedCategories,
        languages: selectedLanguages,
        regions: selectedRegions,
      });

      // Fetch words from Firebase (STRICT: categories + language + region)
      const words = await fetchWords(filters);

      if (words.length === 0) {
        return {
          categoryName: null,
          word: null,
          wordLanguage: null,
          wordRegion: null,
          error:
            "No word exists for the selected Categories + Language + Region filters. Please change filters and try again.",
        };
      }

      // Group words by category (keep full doc for language/region)
      const wordsByCategory: Record<string, typeof words> = {};
      words.forEach((wordDoc) => {
        if (!wordsByCategory[wordDoc.category]) {
          wordsByCategory[wordDoc.category] = [];
        }
        wordsByCategory[wordDoc.category].push(wordDoc);
      });

      const categories = Object.keys(wordsByCategory);
      if (categories.length === 0) {
        return {
          categoryName: null,
          word: null,
          wordLanguage: null,
          wordRegion: null,
          error:
            "No word exists for the selected filters. Please change filters and try again.",
        };
      }

      const random = gameRandom();
      const randomCategory = pickOne(categories, random) as string;
      const categoryDocs = wordsByCategory[randomCategory];
      const chosenDoc = pickOne(categoryDocs, random) as WordDocument;

      return {
        categoryName: randomCategory,
        word: chosenDoc.word,
        wordLanguage: chosenDoc.languages?.[0] ?? null,
        wordRegion: chosenDoc.regions?.[0] ?? null,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching words from Firebase:", error);
      // ONLY fallback to local words if Firebase is not linked / failing
      const local = pickCategoryAndWordLocal(selectedCategories);
      return { categoryName: local.categoryName, word: local.word, wordLanguage: null, wordRegion: null, error: null };
    } finally {
      setIsLoadingWords(false);
    }
  };

  // Fallback function using local words
  const pickCategoryAndWordLocal = (selectedCategories?: string[]) => {
    let pool = allWords;
    if (selectedCategories && selectedCategories.length > 0) {
      const categorySet = new Set(selectedCategories.map(c => c.toLowerCase()));
      pool = allWords.filter((w: any) => 
        w.name && categorySet.has(w.name.toLowerCase())
      );
    }
    
    if (pool.length === 0) {
      pool = allWords; // Fallback to all if no matches
    }
    
    const random = gameRandom();
    const cat = pickOne(pool, random) as (typeof pool)[number];
    const wordsArray: string[] = Array.isArray(cat.words) ? cat.words : [];
    const word = pickOne(wordsArray, random) as string;
    return { categoryName: cat.name as string, word };
  };

  const startGame = async (
    players: number, 
    selectedCategories?: string[],
    selectedLanguages?: string[],
    selectedRegions?: string[]
  ) => {
    const { categoryName: chosenCategory, word, wordLanguage, wordRegion, error } = await pickCategoryAndWord(
      selectedCategories,
      selectedLanguages,
      selectedRegions
    );
    const k = computeMafiaCount(players);
    const nums = shuffle(
      Array.from({ length: players }, (_, i) => i + 1),
      gameRandom()
    );
    const mafiaIds = nums.slice(0, k);
    setState({
      players,
      categoryName: chosenCategory,
      word,
      wordError: error ?? null,
      wordLanguage: wordLanguage ?? null,
      wordRegion: wordRegion ?? null,
      mafiaIds,
      revealedIds: [],
      selectedCategories: selectedCategories || [],
      selectedLanguages: selectedLanguages || [],
      selectedRegions: selectedRegions || [],
    });
  };

  const markRevealed = (playerId: number) => {
    setState((prev) => {
      if (prev.revealedIds.includes(playerId)) return prev;
      return { ...prev, revealedIds: [...prev.revealedIds, playerId] };
    });
  };

  const resetGame = () => setState(DEFAULT_STATE);

  const value = useMemo<GameContextType>(() => ({
    ...state,
    startGame,
    pickCategoryAndWord,
    markRevealed,
    resetGame,
    isLoadingWords,
  }), [state, isLoadingWords]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
