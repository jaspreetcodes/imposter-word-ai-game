import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { UI_STRINGS, ROUTES, TERMS } from "../constants/strings";
import styles from "./MafiaRevealPage.module.css";

/**
 * Multiplayer reveal page - shows mafia for room-based games
 */
export default function RoomRevealPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRoomId, room, players } = useRoom();

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

    // If game hasn't started or no mafia assigned, go back
    if (room.status !== "playing" || !room.gameState.mafiaId) {
      if (roomCode) {
        navigate(`${ROUTES.ROOM}/${roomCode}/game`);
      } else {
        navigate(ROUTES.GAME);
      }
    }
  }, [user, room, currentRoomId, roomCode, navigate]);

  const handleNewGame = () => {
    if (roomCode) {
      navigate(`${ROUTES.ROOM}/${roomCode}`);
    } else {
      navigate(ROUTES.HOME);
    }
  };

  if (!room || !room.gameState.mafiaId) {
    return null;
  }

  const mafiaPlayer = players.find((p) => p.userId === room.gameState.mafiaId);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>{UI_STRINGS.REVEAL_TITLE}</h1>
        </div>

        <div className={styles.content}>
          <div>
            <p className={styles.mafiaText}>
              {mafiaPlayer ? mafiaPlayer.displayName : `${TERMS.PLAYER} —`}
            </p>
          </div>
        </div>

        <button onClick={handleNewGame} className={styles.newGameButton}>
          {UI_STRINGS.REVEAL_NEW_GAME}
        </button>
      </div>
    </div>
  );
}
