import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./mafiaRevealPage.module.css";
import { useGame } from "../contexts/GameContext";

export default function mafiaRevealPage() {
  const navigate = useNavigate();
  const { mafiaId, resetGame, players } = useGame();

  // Redirect to game if no mafia or game not started
  useEffect(() => {
    if (!mafiaId || !players || players === 0) {
      navigate("/game");
    }
  }, [mafiaId, players, navigate]);

  const handleNewGame = () => {
    resetGame();
    navigate("/setup");
  };

  // Don't render if no mafia
  if (!mafiaId) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>The mafia Is...</h1>
        </div>

        <div className={styles.content}>
          <div>
            <p className={styles.mafiaText}>Player {mafiaId ?? "—"}</p>
          </div>
        </div>

        <button onClick={handleNewGame} className={styles.newGameButton}>
          Start a New Game
        </button>
      </div>
    </div>
  );
}

