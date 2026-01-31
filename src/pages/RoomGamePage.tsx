import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { markPlayerRevealed } from "../services/roomService";
import RoomChat from "../components/RoomChat";
import styles from "./GamePage.module.css";
import { UI_STRINGS, TERMS, ROUTES } from "../constants/strings";

/**
 * Multiplayer game page - shows game state for room-based games
 */
export default function RoomGamePage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const { currentRoomId, room, players, currentPlayer } = useRoom();
  const [isRevealing, setIsRevealing] = useState(false);

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

    // If game hasn't started, go to waiting room
    if (room.status !== "playing") {
      navigate(`${ROUTES.ROOM}/${roomCode}`);
      return;
    }
  }, [user, room, currentRoomId, roomCode, navigate]);

  if (!user || !room || !currentPlayer || room.status !== "playing") {
    return null;
  }

  const revealedPlayerIds = room.gameState.revealedPlayerIds || [];
  const allRevealed = players.length > 0 && revealedPlayerIds.length === players.length;

  const cards = useMemo(
    () => {
      if (!players.length) return [];
      return players.map((p) => ({ id: p.playerNumber, playerId: p.userId }));
    },
    [players]
  );

  const handleCardClick = async (playerId: string, playerNumber: number) => {
    if (!currentRoomId || !user) return;
    
    // Only allow clicking your own card
    if (playerId !== user.uid) {
      return;
    }

    // Check if already revealed
    if (revealedPlayerIds.includes(playerId)) {
      return;
    }

    setIsRevealing(true);
    try {
      await markPlayerRevealed(currentRoomId, user.uid);
      // Navigate to player page to show word
      navigate(`${ROUTES.ROOM}/${roomCode}/player/${playerNumber}`);
    } catch (err) {
      console.error("Error marking player as revealed:", err);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button onClick={() => navigate(`${ROUTES.ROOM}/${roomCode}`)} className={styles.backBtn}>
          ← Back to Room
        </button>
        <h2 className={styles.playerCount}>
          {UI_STRINGS.GAME_PLAYERS_LABEL} <strong>{players.length}</strong>
        </h2>
      </header>

      {room.gameState.categoryName && (
        <div style={{ margin: "8px 0", textAlign: "center", color: "var(--text-secondary)" }}>
          Category: <strong>{room.gameState.categoryName}</strong>
        </div>
      )}

      <div className={styles.grid}>
        {cards.map((c) => {
          const isRevealed = revealedPlayerIds.includes(c.playerId);
          const isCurrentPlayer = c.playerId === user.uid;
          
          return (
            <button
              key={c.id}
              onClick={() => handleCardClick(c.playerId, c.id)}
              disabled={isRevealed || !isCurrentPlayer || isRevealing}
              className={`flip-card ${isRevealed ? "revealed" : ""} ${isRevealed ? styles.revealed : ""}`}
            >
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  {players.find(p => p.userId === c.playerId)?.displayName || `${TERMS.PLAYER} ${c.id}`}
                </div>
                <div className="flip-card-back">
                  {players.find(p => p.userId === c.playerId)?.displayName || `${TERMS.PLAYER} ${c.id}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {currentRoomId && user && (
        <div className={styles.chatSection}>
          <RoomChat
            roomId={currentRoomId}
            userId={user.uid}
            displayName={profile?.displayName ?? user.displayName ?? "Player"}
            players={players}
            isHost={room.hostId === user.uid}
            showTurnBanner
            currentTurnPlayerNumber={room.gameState.currentTurnPlayerNumber ?? room.gameState.suggestedStartPlayer}
            roundDirection={room.gameState.roundDirection}
          />
        </div>
      )}

      {allRevealed && (
        <div className={styles.revealButtonContainer}>
          <button 
            onClick={() => navigate(`${ROUTES.ROOM}/${roomCode}/reveal`)} 
            className={styles.revealMafiaButton}
          >
            {UI_STRINGS.GAME_REVEAL_MAFIA}
          </button>
        </div>
      )}
    </div>
  );
}
