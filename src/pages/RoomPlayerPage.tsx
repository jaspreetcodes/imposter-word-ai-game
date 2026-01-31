import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import styles from "./PlayerPage.module.css";

/**
 * Multiplayer player page - shows word for room-based games
 */
export default function RoomPlayerPage() {
  const { roomCode, playerId } = useParams<{ roomCode: string; playerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRoomId, room, currentPlayer } = useRoom();
  const [showWord, setShowWord] = useState(true);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const playerNumber = playerId ? parseInt(playerId, 10) : 1;

  // Redirect if not logged in or no room
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!room || !currentRoomId) {
      if (roomCode) {
        navigate(`${ROUTES.ROOM}/${roomCode}`);
      } else {
        navigate(ROUTES.HOME);
      }
      return;
    }

    // Verify this is the current user's card
    if (currentPlayer && currentPlayer.playerNumber !== playerNumber) {
      navigate(`${ROUTES.ROOM}/${roomCode}/game`);
      return;
    }
  }, [user, room, currentRoomId, currentPlayer, playerNumber, roomCode, navigate]);

  // Auto-hide after 10 seconds
  useEffect(() => {
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
    if (roomCode) {
      navigate(`${ROUTES.ROOM}/${roomCode}/game`);
    } else {
      navigate(ROUTES.GAME);
    }
  };

  if (!user || !room || !currentPlayer) {
    return null;
  }

  const isMafia = currentPlayer.isMafia;
  const word = currentPlayer.word;
  const wordLanguage = room.gameState.wordLanguage ?? null;
  const wordRegion = room.gameState.wordRegion ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {UI_STRINGS.PLAYER_CATEGORY_LABEL} {room.gameState.categoryName ?? "—"}
          </h1>
          {(wordLanguage || wordRegion) && (
            <p className={styles.meta}>
              {wordLanguage && <span>Language: {wordLanguage}</span>}
              {wordLanguage && wordRegion && " · "}
              {wordRegion && <span>Origin: {wordRegion}</span>}
            </p>
          )}
        </div>

        <div className={styles.content}>
          {showWord && (
            <div className={styles.wordContainer}>
              <p className={styles.word}>
                {isMafia ? UI_STRINGS.PLAYER_MAFIA_MESSAGE : (word ?? "—")}
              </p>
            </div>
          )}
          
          {!showWord && (
            <div className={styles.wordHidden}>
              <p>{UI_STRINGS.PLAYER_WORD_HIDDEN}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowWord((prev) => !prev)}
          className={styles.toggleButton}
        >
          {showWord ? "Hide word" : "Show word"}
        </button>
        <button onClick={finishAndBack} className={styles.hideButton}>
          {UI_STRINGS.PLAYER_HIDE_BUTTON}
        </button>
      </div>
    </div>
  );
}
