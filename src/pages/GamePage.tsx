import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./GamePage.module.css";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, TERMS, ROUTES } from "../constants/strings";

export default function GamePage() {
  const navigate = useNavigate();
  const { revealedIds, players, resetGame, wordError, isLoadingWords, mafiaId } = useGame();
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
  
  // State for start suggestion popup
  const [showStartSuggestion, setShowStartSuggestion] = useState(false);
  const [suggestedStartPlayer, setSuggestedStartPlayer] = useState<number | null>(null);
  const [roundDirection, setRoundDirection] = useState<"clockwise" | "counter-clockwise" | null>(null);

  // Show start suggestion when all players have revealed
  useEffect(() => {
    if (allRevealed && !showStartSuggestion && suggestedStartPlayer === null && mafiaId) {
      // Generate suggestion: pick a random player that is NOT the mafia
      const nonMafiaPlayers = Array.from({ length: validPlayers }, (_, i) => i + 1).filter(
        (id) => id !== mafiaId
      );
      
      if (nonMafiaPlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * nonMafiaPlayers.length);
        const suggested = nonMafiaPlayers[randomIndex];
        const direction = Math.random() < 0.5 ? "clockwise" : "counter-clockwise";
        
        setSuggestedStartPlayer(suggested);
        setRoundDirection(direction);
        setShowStartSuggestion(true);
      }
    }
  }, [allRevealed, showStartSuggestion, suggestedStartPlayer, validPlayers, mafiaId]);

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

      {isLoadingWords && (
        <div style={{ margin: "8px 0", color: "var(--text-secondary)", textAlign: "center" }}>
          Loading word…
        </div>
      )}

      {wordError && (
        <div
          style={{
            margin: "10px auto 0",
            maxWidth: 720,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No matching word found</div>
          <div style={{ color: "var(--text-secondary)" }}>{wordError}</div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 10 }}>
            <button className={styles.backBtn} onClick={() => { resetGame(); setLockedPlayerCount(null); navigate(ROUTES.SETUP); }}>
              Change filters
            </button>
          </div>
        </div>
      )}

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

      {allRevealed && !showStartSuggestion && (
        <div className={styles.revealButtonContainer}>
          <button 
            onClick={() => navigate(ROUTES.REVEAL_MAFIA)} 
            className={styles.revealMafiaButton}
          >
            {UI_STRINGS.GAME_REVEAL_MAFIA}
          </button>
        </div>
      )}

      {showStartSuggestion && suggestedStartPlayer && roundDirection && (
        <div style={overlay} onClick={() => setShowStartSuggestion(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: 8, color: "var(--text-primary)", fontSize: 24, fontWeight: 700 }}>
              {UI_STRINGS.GAME_START_SUGGESTION_TITLE}
            </h3>
            <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: 16 }}>
              {UI_STRINGS.GAME_START_SUGGESTION_MESSAGE}
            </p>
            
            <div style={{ 
              marginBottom: 16, 
              padding: 16, 
              background: "var(--bg-primary)", 
              borderRadius: 12,
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ marginBottom: 12, fontSize: 16, color: "var(--text-secondary)", fontWeight: 600 }}>
                {UI_STRINGS.GAME_START_PLAYER_SUGGESTION}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
                {TERMS.PLAYER} {suggestedStartPlayer}
              </div>
              
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                <div style={{ marginBottom: 8, fontSize: 16, color: "var(--text-secondary)", fontWeight: 600 }}>
                  {UI_STRINGS.GAME_START_DIRECTION}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
                  {roundDirection === "clockwise" 
                    ? UI_STRINGS.GAME_START_CLOCKWISE 
                    : UI_STRINGS.GAME_START_COUNTER_CLOCKWISE}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button 
                className={styles.backBtn} 
                onClick={() => setShowStartSuggestion(false)}
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  padding: "12px 24px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {UI_STRINGS.GAME_START_CONTINUE}
              </button>
            </div>
          </div>
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
