import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "./PlayerPage.module.css";

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWord, setShowWord] = useState(true);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const playerNumber = playerId ? parseInt(playerId, 10) : 1;
  const word = "NAN"; // Placeholder - will be replaced with actual game logic

  useEffect(() => {
    // Auto-hide after 10 seconds
    const id = setTimeout(() => {
      setShowWord(false);
    }, 10000);
    setTimeoutId(id);

    return () => {
      if (id) clearTimeout(id);
    };
  }, []);

  const handleHideWordAndPass = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Navigate back to game page and mark this card as inactive
    const urlParams = new URLSearchParams(location.search);
    const players = urlParams.get("players") || "3";
    navigate(`/game?players=${players}`, {
      state: { inactiveCardId: playerNumber }
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Category: Food</h1>
        </div>

        <div className={styles.content}>
          {showWord && (
            <div 
              className={styles.wordContainer}
              onClick={handleHideWordAndPass}
              style={{ cursor: 'pointer' }}
            >
              <p className={styles.word}>{word}</p>
            </div>
          )}
          
          {!showWord && (
            <div className={styles.wordHidden}>
              <p>Word hidden</p>
            </div>
          )}
        </div>

        <button onClick={handleHideWordAndPass} className={styles.hideButton}>
          Hide Word & Pass
        </button>
      </div>
    </div>
  );
}

