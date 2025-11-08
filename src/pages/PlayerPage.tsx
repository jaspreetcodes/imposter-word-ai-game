import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./PlayerPage.module.css";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, ROUTES } from "../constants/strings";

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { categoryName, word, mafiaId, markRevealed } = useGame();
  const [showWord, setShowWord] = useState(true);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const playerNumber = playerId ? parseInt(playerId, 10) : 1;
  const isMafia = mafiaId === playerNumber;

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

  const finishAndBack = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    markRevealed(playerNumber);
    navigate(ROUTES.GAME);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{UI_STRINGS.PLAYER_CATEGORY_LABEL} {categoryName ?? "—"}</h1>
        </div>

        <div className={styles.content}>
          {showWord && (
            <div 
              className={styles.wordContainer}
              onClick={finishAndBack}
              style={{ cursor: 'pointer' }}
            >
              <p className={styles.word}>{isMafia ? UI_STRINGS.PLAYER_MAFIA_MESSAGE : (word ?? "—")}</p>
            </div>
          )}
          
          {!showWord && (
            <div className={styles.wordHidden}>
              <p>{UI_STRINGS.PLAYER_WORD_HIDDEN}</p>
            </div>
          )}
        </div>

        <button onClick={finishAndBack} className={styles.hideButton}>
          {UI_STRINGS.PLAYER_HIDE_BUTTON}
        </button>
      </div>
    </div>
  );
}

