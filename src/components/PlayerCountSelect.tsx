import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PlayerCountSelect.module.css";
import { words } from "../assets/words";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, ROUTES } from "../constants/strings";

export default function PlayerCountSelect() {
  const navigate = useNavigate();
  const { startGame } = useGame();
  const [players, setPlayers] = useState<number>(3);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const options = useMemo(() => {
    const nums: number[] = [];
    for (let i = 2; i <= 25; i++) nums.push(i);
    return nums;
  }, []);

  const categoryNames = useMemo(() => {
    const s = new Set<string>();
    for (const w of words as any[]) {
      if (w?.name) s.add(w.name);
    }
    return Array.from(s).sort();
  }, []);

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(name)) {
        return prev.filter(c => c !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const onEnter = () => {
    // If no categories selected, pick from all
    startGame(players, selectedCategories.length > 0 ? selectedCategories : undefined);
    navigate(ROUTES.GAME);
  };

  const onSaveCategories = () => {
    if (selectedCategories.length === 0) {
      // If no categories selected, allow starting with all categories
      startGame(players);
    } else {
      startGame(players, selectedCategories);
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
            <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "14px" }}>
              {UI_STRINGS.SETUP_CATEGORIES_DESCRIPTION}
            </p>
            <div style={checkboxList}>
              {categoryNames.map((c) => (
                <label key={c} style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c)}
                    onChange={() => toggleCategory(c)}
                    style={checkboxInput}
                  />
                  <span style={checkboxText}>{c}</span>
                </label>
              ))}
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
  width: "min(720px, 92vw)",
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 10px 40px var(--shadow)",
};

const modalTitle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "var(--text-primary)",
};

const checkboxList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  maxHeight: "400px",
  overflowY: "auto",
  marginBottom: 20,
  padding: "8px 0",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: 8,
  transition: "background-color 0.2s ease",
};

const checkboxInput: React.CSSProperties = {
  width: 20,
  height: 20,
  cursor: "pointer",
  accentColor: "var(--button-bg)",
};

const checkboxText: React.CSSProperties = {
  color: "var(--text-primary)",
  fontSize: "16px",
  userSelect: "none",
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
