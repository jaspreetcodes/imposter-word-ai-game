import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MafiaRevealPage.module.css";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, TERMS, ROUTES } from "../constants/strings";

export default function MafiaRevealPage() {
  const navigate = useNavigate();
  const { mafiaId, resetGame, players } = useGame();

  // Redirect to game if no mafia or game not started
  useEffect(() => {
    if (!mafiaId || !players || players === 0) {
      navigate(ROUTES.GAME);
    }
  }, [mafiaId, players, navigate]);

  const handleNewGame = () => {
    resetGame();
    navigate(ROUTES.SETUP);
  };

  // Don't render if no mafia
  if (!mafiaId) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{UI_STRINGS.REVEAL_TITLE}</h1>
        </div>

        <div className={styles.content}>
          <div>
            <p className={styles.mafiaText}>{TERMS.PLAYER} {mafiaId ?? "—"}</p>
          </div>
        </div>

        <button onClick={handleNewGame} className={styles.newGameButton}>
          {UI_STRINGS.REVEAL_NEW_GAME}
        </button>
      </div>
    </div>
  );
}

