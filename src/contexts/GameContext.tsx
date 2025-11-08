import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { words as allWords } from "../assets/words";
import { STORAGE_KEYS } from "../constants/strings";

export interface GameState {
  players: number;
  categoryName: string | null;
  word: string | null;
  mafiaId: number | null;
  revealedIds: number[]; // store as array for serialization
  selectedCategories: string[]; // selected categories for word selection
}

interface GameContextType extends GameState {
  startGame: (players: number, selectedCategories?: string[]) => void;
  pickCategoryAndWord: (selectedCategories?: string[]) => { categoryName: string; word: string };
  markRevealed: (playerId: number) => void;
  resetGame: () => void;
}

const DEFAULT_STATE: GameState = {
  players: 0,
  categoryName: null,
  word: null,
  mafiaId: null,
  revealedIds: [],
  selectedCategories: [],
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.GAME_STATE);
      if (raw) {
        const parsed = JSON.parse(raw) as any;
        // Migrate old imposterId to mafiaId if needed
        if ('imposterId' in parsed && !('mafiaId' in parsed)) {
          parsed.mafiaId = parsed.imposterId;
          delete parsed.imposterId;
        }
        // Ensure all required fields exist
        return {
          players: parsed.players || 0,
          categoryName: parsed.categoryName || null,
          word: parsed.word || null,
          mafiaId: parsed.mafiaId || null,
          revealedIds: parsed.revealedIds || [],
          selectedCategories: parsed.selectedCategories || [],
        } as GameState;
      }
      return DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  }, [state]);

  const pickCategoryAndWord = (selectedCategories?: string[]) => {
    // Filter words based on selected categories
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
    
    const cat = pool[Math.floor(Math.random() * pool.length)];
    const wordsArray: string[] = Array.isArray(cat.words) ? cat.words : [];
    const word = wordsArray[Math.floor(Math.random() * wordsArray.length)];
    return { categoryName: cat.name as string, word };
  };

  const startGame = (players: number, selectedCategories?: string[]) => {
    const { categoryName: chosenCategory, word } = pickCategoryAndWord(selectedCategories);
    const mafiaId = Math.max(1, Math.floor(Math.random() * players) + 1);
    setState({ 
      players, 
      categoryName: chosenCategory, 
      word, 
      mafiaId, 
      revealedIds: [],
      selectedCategories: selectedCategories || []
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
  }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
