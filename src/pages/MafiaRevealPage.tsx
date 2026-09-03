import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MafiaRevealPage.module.css";
import { useGame } from "../contexts/GameContext";
import { UI_STRINGS, TERMS, ROUTES } from "../constants/strings";

export default function MafiaRevealPage() {
  const navigate = useNavigate();
  const { mafiaIds, resetGame, players } = useGame();

  // Redirect to game if no mafia or game not started
  useEffect(() => {
    if (mafiaIds.length === 0 || !players || players === 0) {
      navigate(ROUTES.GAME);
    }
  }, [mafiaIds, players, navigate]);

  const handleNewGame = () => {
    resetGame();
    navigate(ROUTES.SETUP);
  };

  // Don't render if no mafia
  if (mafiaIds.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrap} data-cy="mafia-reveal">
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{UI_STRINGS.REVEAL_TITLE}</h1>
        </div>

        <div className={styles.content}>
          <div>
            <p className={styles.mafiaText} data-cy="mafia-result">
              {mafiaIds.length === 1
                ? `${TERMS.PLAYER} ${mafiaIds[0]}`
                : `${TERMS.PLAYER}s: ${[...mafiaIds].sort((a, b) => a - b).join(", ")}`}
            </p>
          </div>
        </div>

        <button onClick={handleNewGame} className={styles.newGameButton} data-cy="new-game">
          {UI_STRINGS.REVEAL_NEW_GAME}
        </button>
      </div>
    </div>
  );
}

