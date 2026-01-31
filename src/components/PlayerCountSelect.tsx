import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PlayerCountSelect.module.css";
import { words } from "../assets/words"; // Fallback
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import { ALL_CATEGORIES } from "../constants/categories";
import CategoriesSelector, { type SelectedFilters } from "./CategoriesSelector";
import { fetchCategories } from "../services/wordsService";

export default function PlayerCountSelect() {
  const navigate = useNavigate();
  const { startGame } = useGame();
  const [players, setPlayers] = useState<number>(3);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    categories: [],
    languages: [],
    regions: [],
  });

  // Memoize the callback to prevent infinite loops
  const handleFiltersChange = useCallback((filters: SelectedFilters) => {
    setSelectedFilters(filters);
    setSelectedCategories(filters.categories);
  }, []);

  const options = useMemo(() => {
    const nums: number[] = [];
    for (let i = 2; i <= 25; i++) nums.push(i);
    return nums;
  }, []);

  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  // Fetch categories from Firebase; merge with ALL_CATEGORIES so Names, Chemicals, etc. always appear
  useEffect(() => {
    fetchCategories()
      .then((categories) => {
        const fromWords = new Set<string>();
        for (const w of words as { name?: string }[]) {
          if (w?.name) fromWords.add(w.name);
        }
        const merged = Array.from(new Set([...ALL_CATEGORIES, ...categories, ...fromWords])).sort();
        setCategoryNames(merged);
      })
      .catch(() => {
        setCategoryNames([...ALL_CATEGORIES]);
      });
  }, []);


  const onEnter = async () => {
    // If no categories selected, pick from all
    await startGame(
      players, 
      selectedCategories.length > 0 ? selectedCategories : undefined,
      selectedFilters.languages.length > 0 ? selectedFilters.languages : undefined,
      selectedFilters.regions.length > 0 ? selectedFilters.regions : undefined
    );
    navigate(ROUTES.GAME);
  };

  const onSaveCategories = async () => {
    if (selectedCategories.length === 0) {
      // If no categories selected, allow starting with all categories
      await startGame(
        players,
        undefined,
        selectedFilters.languages.length > 0 ? selectedFilters.languages : undefined,
        selectedFilters.regions.length > 0 ? selectedFilters.regions : undefined
      );
    } else {
      await startGame(
        players, 
        selectedCategories,
        selectedFilters.languages.length > 0 ? selectedFilters.languages : undefined,
        selectedFilters.regions.length > 0 ? selectedFilters.regions : undefined
      );
    }
    setShowCategories(false);
    navigate(ROUTES.GAME);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>{UI_STRINGS.SETUP_TITLE}</h1>
        <label className={styles.label}>
          {UI_STRINGS.SETUP_SELECT_PLAYERS}
          <select
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value, 10))}
            className={styles.select}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gap: 12 }}>
          <button onClick={onEnter} className={styles.button}>
            {UI_STRINGS.SETUP_ENTER_BUTTON}
          </button>
          <button onClick={() => setShowCategories(true)} className={styles.button}>
            {UI_STRINGS.SETUP_CATEGORIES_BUTTON}
          </button>
        </div>
      </div>

      {showCategories && (
        <div style={modalOverlay} onClick={() => setShowCategories(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitle}>{UI_STRINGS.SETUP_SELECT_CATEGORIES}</h2>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 16 }}>
              <CategoriesSelector
                baseCategories={categoryNames}
                onChangeSelected={handleFiltersChange}
              />
            </div>
            <div style={modalActions}>
              <button onClick={() => setShowCategories(false)} className={styles.button}>
                {UI_STRINGS.SETUP_CANCEL}
              </button>
              <button onClick={onSaveCategories} className={styles.button}>
                {UI_STRINGS.SETUP_SAVE_START}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 200,
};

const modal: React.CSSProperties = {
  width: "min(900px, 95vw)",
  maxHeight: "90vh",
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 16,
  padding: 32,
  boxShadow: "0 10px 40px var(--shadow)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalTitle: React.CSSProperties = {
  margin: "0 0 16px",
  color: "var(--text-primary)",
  fontSize: "20px",
  fontWeight: 700,
};

const modalActions: React.CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
};


// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import styles from "./PlayerCountSelect.module.css";
// import { ROUTES } from "../constants/strings";
// import type {
//   SelectedFilters,
// } from "../components/CategoriesSelector";
// import CategoriesSelector from "../components/CategoriesSelector";

// export default function PlayerCountSelect() {
//   const navigate = useNavigate();
//   const [players, setPlayers] = useState(3);
//   const [showCategories, setShowCategories] = useState(false);

//   // store chosen filters for later use (AI / word pool)
//   const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
//     categories: [],
//     languages: [],
//     regions: [],
//   });

//   const handleStart = () => {
//     // TODO: send players + selectedFilters via context / search params
//     navigate(ROUTES.GAME.replace(":players", String(players)));
//   };

//   return (
//     <main className={styles.wrap}>
//       <section className={styles.card}>
//         <h1 className={styles.title}>Game Settings</h1>

//         {/* Player count select */}
//         <label className={styles.label}>
//           Number of players
//           <select
//             className={styles.select}
//             value={players}
//             onChange={(e) => setPlayers(parseInt(e.target.value, 10))}
//           >
//             {Array.from({ length: 24 }, (_, i) => i + 2).map((n) => (
//               <option key={n} value={n}>
//                 {n}
//               </option>
//             ))}
//           </select>
//         </label>

//         {/* Button to open categories modal */}
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px"}}>
//         <button
//           type="button"
//           className={styles.secondaryBtn}
//           onClick={() => setShowCategories(true)}
//         >
//           ⚙️ Categories, Languages & Regions
//         </button>

//         </div>
//         <div className={styles.ctaRow}>
//           <button className={styles.playBtn} onClick={handleStart}>
//             Start Game
//           </button>
//         </div>
//       </section>

//       {/* Modal for categories */}
//       {showCategories && (
//         <div
//           className={styles.modalOverlay}
//           onClick={() => setShowCategories(false)}
//         >
//           <div
//             className={styles.modal}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className={styles.modalHeader}>
//               <h2 className={styles.modalTitle}>Customize Word Sources</h2>
//               <button
//                 className={styles.modalClose}
//                 onClick={() => setShowCategories(false)}
//                 aria-label="Close"
//               >
//                 ×
//               </button>
//             </div>

//             <CategoriesSelector 
//               onChangeSelected={(sel) => setSelectedFilters(sel)}
//             />

//             <div className={styles.modalFooter}>
//               <button
//                 className={styles.modalSaveBtn}
//                 onClick={() => setShowCategories(false)}
//               >
//                 Done
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </main>
//   );
// }

// const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

// const options = useMemo(() => {
//   const nums: number[] = [];
//   for (let i = 2; i <= 25; i++) nums.push(i);
//   return nums;
// }, []);

// const categoryNames = useMemo(() => {
//   const s = new Set<string>();
//   for (const w of words as any[]) {
//     if (w?.name) s.add(w.name);
//   }
//   return Array.from(s).sort();
// }, []);

// const toggleCategory = (name: string) => {
//   setSelectedCategories(prev => {
//     if (prev.includes(name)) {
//       return prev.filter(c => c !== name);
//     } else {
//       return [...prev, name];
//     }
//   });
// };
