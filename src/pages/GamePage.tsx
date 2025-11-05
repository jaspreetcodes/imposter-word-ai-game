import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./GamePage.module.css";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function GamePage() {
  const query = useQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const players = Math.max(
    2,
    Math.min(25, parseInt(query.get("players") || "3", 10))
  );
  
  const initial = useMemo(
    () =>
      Array.from({ length: players }, (_, i) => ({
        id: i + 1,
        revealed: false,
        inactive: false,
      })),
      [players]
    );
    
  const [cards, setCards] = useState(initial);

  // Reset cards when players count changes
  useEffect(() => {
    setCards(initial);
  }, [players, initial]);

  // Mark card as inactive when returning from player page
  useEffect(() => {
    const inactiveCardId = (location.state as { inactiveCardId?: number })?.inactiveCardId;
    if (inactiveCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === inactiveCardId ? { ...c, revealed: true, inactive: true } : c
        )
      );
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  const handleCardClick = (id: number) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      // Prevent clicking if already revealed or inactive
      if (card?.revealed || card?.inactive) {
        return prev;
      }
      // Navigate to player page
      navigate(`/player/${id}?players=${players}`);
      // Mark as revealed
      return prev.map((c) => (c.id === id ? { ...c, revealed: true } : c));
    });
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button onClick={() => navigate("/")} className={styles.backBtn}>
          ← Change Players
        </button>
        <h2 className={styles.playerCount}>
          Players: <strong>{players}</strong>
        </h2>
      </header>

      <div className={styles.grid}>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCardClick(c.id)}
            disabled={c.revealed || c.inactive}
            className={`flip-card ${c.revealed ? "revealed" : ""} ${(c.revealed || c.inactive) ? styles.revealed : ""}`}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">Player {c.id}</div>
              <div className="flip-card-back">
                {c.inactive ? `Player ${c.id}` : "NAN"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
