import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./GamePage.module.css";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, TERMS, ROUTES } from "../constants/strings";

export default function GamePage() {
  const navigate = useNavigate();
  const { revealedIds, players, resetGame } = useGame();
  const [lockedPlayerCount, setLockedPlayerCount] = useState<number | null>(null);

  // Lock the player count once we have a valid game
  useEffect(() => {
    if (players && players > 0 && !lockedPlayerCount) {
      setLockedPlayerCount(players);
    }
  }, [players, lockedPlayerCount]);

  // Redirect to setup if no game started
  useEffect(() => {
    if (!players || players === 0) {
      navigate(ROUTES.SETUP);
      return;
    }
  }, [players, navigate]);

  // Use locked count if available, otherwise use current players count
  const validPlayers = lockedPlayerCount || (players && players > 0 ? Math.max(2, Math.min(25, players)) : 3);

  const cards = useMemo(
    () => {
      if (!validPlayers || validPlayers < 2) return [];
      return Array.from({ length: validPlayers }, (_, i) => ({ id: i + 1 }));
    },
    [validPlayers]
  );

  const [showConfirm, setShowConfirm] = useState(false);

  const handleCardClick = (id: number) => {
    if (revealedIds.includes(id)) return; // already revealed, freeze
    navigate(`${ROUTES.PLAYER}/${id}`);
  };

  const handleResetAndGoBack = () => {
    resetGame();
    setLockedPlayerCount(null); // Reset locked count when starting new game
    navigate(ROUTES.SETUP);
  };

  // Check if all players have revealed their cards
  const allRevealed = validPlayers > 0 && revealedIds.length === validPlayers;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button onClick={() => setShowConfirm(true)} className={styles.backBtn}>
          {UI_STRINGS.GAME_CHANGE_PLAYERS}
        </button>
        <h2 className={styles.playerCount}>
          {UI_STRINGS.GAME_PLAYERS_LABEL} <strong>{validPlayers}</strong>
        </h2>
      </header>

      <div className={styles.grid}>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCardClick(c.id)}
            disabled={revealedIds.includes(c.id)}
            className={`flip-card ${revealedIds.includes(c.id) ? "revealed" : ""} ${revealedIds.includes(c.id) ? styles.revealed : ""}`}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">{TERMS.PLAYER} {c.id}</div>
              <div className="flip-card-back">{TERMS.PLAYER} {c.id}</div>
            </div>
          </button>
        ))}
      </div>

      {allRevealed && (
        <div className={styles.revealButtonContainer}>
          <button 
            onClick={() => navigate(ROUTES.REVEAL_MAFIA)} 
            className={styles.revealMafiaButton}
          >
            {UI_STRINGS.GAME_REVEAL_MAFIA}
          </button>
        </div>
      )}

      {showConfirm && (
        <div style={overlay} onClick={() => setShowConfirm(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{UI_STRINGS.GAME_CONFIRM_TITLE}</h3>
            <p style={{ margin: "8px 0 16px", color: "var(--text-secondary)" }}>
              {UI_STRINGS.GAME_CONFIRM_MESSAGE}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className={styles.backBtn} onClick={() => setShowConfirm(false)}>{UI_STRINGS.GAME_CONFIRM_CANCEL}</button>
              <button 
                className={styles.backBtn} 
                onClick={handleResetAndGoBack}
              >
                {UI_STRINGS.GAME_CONFIRM_YES}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 200,
};

const dialog: React.CSSProperties = {
  width: "min(520px, 92vw)",
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 10px 40px var(--shadow)",
};
