import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { joinRoom, getRoomByCode } from "../services/roomService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { setCurrentRoomId } = useRoom();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    }
  }, [user, navigate]);

  if (!user || !profile) {
    return null;
  }

  const handleJoinRoom = async () => {
    if (!user || !profile) return;

    const code = roomCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-character room code");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const roomInfo = await getRoomByCode(code);
      if (!roomInfo) {
        setError(UI_STRINGS.MULTI_ROOM_NOT_FOUND);
        setIsJoining(false);
        return;
      }

      await joinRoom(code, user.uid, profile.displayName);

      setCurrentRoomId(roomInfo.roomId);
      navigate(`${ROUTES.ROOM}/${code}`);
    } catch (err: unknown) {
      console.error("Error joining room:", err);
      const message = (err as Error).message || "";
      if (message.includes("full")) {
        setError(UI_STRINGS.MULTI_ROOM_FULL);
      } else if (message.includes("not found")) {
        setError(UI_STRINGS.MULTI_ROOM_NOT_FOUND);
      } else {
        setError(message || "Failed to join room");
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <LobbyShell
      badge="Multiplayer"
      title={UI_STRINGS.MULTI_JOIN_ROOM}
      subtitle="Enter the room code to join a game"
    >
      {error && <div className={s.error}>{error}</div>}

      <div className={s.form}>
        <div className={s.field}>
          <label htmlFor="roomCode" className={s.label}>
            {UI_STRINGS.MULTI_ROOM_CODE}
          </label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(e) => {
              const value = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);
              setRoomCode(value);
              setError(null);
            }}
            className={`${s.input} ${s.inputMono}`}
            placeholder={UI_STRINGS.MULTI_ROOM_CODE_PLACEHOLDER}
            maxLength={6}
            disabled={isJoining}
          />
        </div>

        <div className={s.actionsRow}>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className={s.ctaGhost}
            disabled={isJoining}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoinRoom}
            className={s.ctaPrimary}
            disabled={isJoining || roomCode.length !== 6}
          >
            {isJoining ? "Joining…" : "Join Room"}
          </button>
        </div>
      </div>
    </LobbyShell>
  );
}
