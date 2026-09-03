import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { startGame, leaveRoom } from "../services/roomService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import RoomChat from "../components/RoomChat";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";

export default function WaitingRoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const { currentRoomId, room, players, isLoading, setCurrentRoomId } = useRoom();
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    }
  }, [user, navigate]);

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
    } catch (err: unknown) {
      console.error("Error starting game:", err);
      setError((err as Error).message || "Failed to start game");
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
    } catch (err: unknown) {
      console.error("Error leaving room:", err);
      setError((err as Error).message || "Failed to leave room");
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <LobbyShell
        badge="Multiplayer"
        title="Waiting room"
        subtitle="Loading room…"
        wide
      />
    );
  }

  if (!room) {
    return (
      <LobbyShell badge="Multiplayer" title="Room not found" wide>
        <div className={s.error}>Room not found</div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className={s.ctaPrimary}
        >
          Go Home
        </button>
      </LobbyShell>
    );
  }

  return (
    <LobbyShell
      badge="Multiplayer"
      title={`Room ${room.roomCode}`}
      subtitle={isHost ? "You are the host" : "Waiting for the host to start"}
      wide
    >
      <div className={s.headerRow}>
        <span />
        {isHost && <span className={s.hostBadge}>{UI_STRINGS.MULTI_HOST}</span>}
      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.roomCodeBox}>
        <div className={s.roomCodeLabel}>Share this code:</div>
        <div className={s.roomCode}>{room.roomCode}</div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(room.roomCode)}
          className={s.copyButton}
        >
          {UI_STRINGS.MULTI_COPY_CODE}
        </button>
      </div>

      <h3 className={s.sectionTitle}>
        {UI_STRINGS.MULTI_PLAYERS_IN_ROOM} ({players.length}/25)
      </h3>
      <div className={s.playersList}>
        {players.map((player) => (
          <div
            key={player.userId}
            className={`${s.playerItem} ${player.userId === user.uid ? s.playerItemCurrent : ""}`}
          >
            <div className={s.playerNumber}>{player.playerNumber}</div>
            <div className={s.playerName}>
              {player.displayName}
              {player.userId === user.uid && ` (${UI_STRINGS.MULTI_YOU})`}
              {player.userId === room.hostId && (
                <span className={s.hostTag}> {UI_STRINGS.MULTI_HOST}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {players.length < 2 && (
        <div className={s.waitingMessage}>
          {UI_STRINGS.MULTI_WAITING_FOR_PLAYERS} (Need at least 2 players)
        </div>
      )}

      {currentRoomId && user && (
        <div className={s.chatSection}>
          <RoomChat
            roomId={currentRoomId}
            userId={user.uid}
            displayName={profile?.displayName ?? user.displayName ?? "Player"}
            players={players}
            isHost={isHost}
          />
        </div>
      )}

      <div className={s.actionsRow}>
        <button
          type="button"
          onClick={handleLeaveRoom}
          className={s.ctaDanger}
          disabled={isLeaving}
        >
          {isLeaving ? "Leaving…" : UI_STRINGS.MULTI_LEAVE_ROOM}
        </button>
        {canStart && (
          <button
            type="button"
            onClick={handleStartGame}
            className={s.ctaPrimary}
            disabled={isStarting}
          >
            {isStarting ? "Starting…" : UI_STRINGS.MULTI_START_GAME}
          </button>
        )}
      </div>
    </LobbyShell>
  );
}
