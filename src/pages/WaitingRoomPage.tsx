import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { startGame, leaveRoom } from "../services/roomService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import RoomChat from "../components/RoomChat";
import styles from "./WaitingRoomPage.module.css";

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const { currentRoomId, room, players, isLoading, setCurrentRoomId } = useRoom();
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load room by code if not already loaded
  useEffect(() => {
    if (roomCode && !currentRoomId) {
      const loadRoom = async () => {
        try {
          const { getRoomByCode } = await import("../services/roomService");
          const roomInfo = await getRoomByCode(roomCode);
          if (roomInfo) {
            setCurrentRoomId(roomInfo.roomId);
          } else {
            navigate(ROUTES.JOIN_ROOM);
          }
        } catch (err) {
          console.error("Error loading room:", err);
          navigate(ROUTES.JOIN_ROOM);
        }
      };
      loadRoom();
    }
  }, [roomCode, currentRoomId, setCurrentRoomId, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    }
  }, [user, navigate]);

  // Redirect to game if game has started
  useEffect(() => {
    if (room && room.status === "playing" && currentRoomId) {
      navigate(`${ROUTES.ROOM}/${roomCode}/game`);
    }
  }, [room, currentRoomId, roomCode, navigate]);

  if (!user || !roomCode) {
    return null;
  }

  const isHost = room?.hostId === user.uid;
  const canStart = isHost && players.length >= 2 && room?.status === "waiting";

  const handleStartGame = async () => {
    if (!currentRoomId || !user) return;

    setIsStarting(true);
    setError(null);

    try {
      await startGame(currentRoomId, user.uid);
      // Navigation will happen via useEffect when status changes to "playing"
    } catch (err: any) {
      console.error("Error starting game:", err);
      setError(err.message || "Failed to start game");
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoomId || !user) return;

    setIsLeaving(true);

    try {
      await leaveRoom(currentRoomId, user.uid);
      setCurrentRoomId(null);
      navigate(ROUTES.HOME);
    } catch (err: any) {
      console.error("Error leaving room:", err);
      setError(err.message || "Failed to leave room");
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>Loading room...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.error}>Room not found</div>
          <button onClick={() => navigate(ROUTES.HOME)} className={styles.button}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Room: {room.roomCode}</h1>
          {isHost && <span className={styles.hostBadge}>{UI_STRINGS.MULTI_HOST}</span>}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.roomCodeSection}>
          <div className={styles.roomCodeLabel}>Share this code:</div>
          <div className={styles.roomCode}>{room.roomCode}</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(room.roomCode);
              // Could show a toast here
            }}
            className={styles.copyButton}
          >
            {UI_STRINGS.MULTI_COPY_CODE}
          </button>
        </div>

        <div className={styles.playersSection}>
          <h3 className={styles.sectionTitle}>
            {UI_STRINGS.MULTI_PLAYERS_IN_ROOM} ({players.length}/25)
          </h3>
          <div className={styles.playersList}>
            {players.map((player) => (
              <div
                key={player.userId}
                className={`${styles.playerItem} ${player.userId === user.uid ? styles.currentPlayer : ""}`}
              >
                <div className={styles.playerNumber}>{player.playerNumber}</div>
                <div className={styles.playerName}>
                  {player.displayName}
                  {player.userId === user.uid && ` (${UI_STRINGS.MULTI_YOU})`}
                  {player.userId === room.hostId && (
                    <span className={styles.hostTag}> {UI_STRINGS.MULTI_HOST}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {players.length < 2 && (
          <div className={styles.waitingMessage}>
            {UI_STRINGS.MULTI_WAITING_FOR_PLAYERS} (Need at least 2 players)
          </div>
        )}

        {currentRoomId && user && (
          <div className={styles.chatSection}>
            <RoomChat
              roomId={currentRoomId}
              userId={user.uid}
              displayName={profile?.displayName ?? user.displayName ?? "Player"}
              players={players}
              isHost={isHost}
            />
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleLeaveRoom}
            className={styles.leaveButton}
            disabled={isLeaving}
          >
            {isLeaving ? "Leaving..." : UI_STRINGS.MULTI_LEAVE_ROOM}
          </button>
          {canStart && (
            <button
              onClick={handleStartGame}
              className={styles.startButton}
              disabled={isStarting}
            >
              {isStarting ? "Starting..." : UI_STRINGS.MULTI_START_GAME}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
