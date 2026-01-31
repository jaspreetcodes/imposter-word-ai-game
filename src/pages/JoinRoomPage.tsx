import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../contexts/RoomContext";
import { joinRoom, getRoomByCode } from "../services/roomService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import styles from "./JoinRoomPage.module.css";

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { setCurrentRoomId } = useRoom();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
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
      // Check if room exists
      const roomInfo = await getRoomByCode(code);
      if (!roomInfo) {
        setError(UI_STRINGS.MULTI_ROOM_NOT_FOUND);
        setIsJoining(false);
        return;
      }

      // Join the room
      await joinRoom(code, user.uid, profile.displayName);

      // Set current room and navigate
      setCurrentRoomId(roomInfo.roomId);
      navigate(`${ROUTES.ROOM}/${code}`);
    } catch (err: any) {
      console.error("Error joining room:", err);
      if (err.message.includes("full")) {
        setError(UI_STRINGS.MULTI_ROOM_FULL);
      } else if (err.message.includes("not found")) {
        setError(UI_STRINGS.MULTI_ROOM_NOT_FOUND);
      } else {
        setError(err.message || "Failed to join room");
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>{UI_STRINGS.MULTI_JOIN_ROOM}</h1>
        <p className={styles.subtitle}>Enter the room code to join a game</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="roomCode" className={styles.label}>
              {UI_STRINGS.MULTI_ROOM_CODE}
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                setRoomCode(value);
                setError(null);
              }}
              className={styles.input}
              placeholder={UI_STRINGS.MULTI_ROOM_CODE_PLACEHOLDER}
              maxLength={6}
              disabled={isJoining}
            />
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className={styles.cancelButton}
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              onClick={handleJoinRoom}
              className={styles.joinButton}
              disabled={isJoining || roomCode.length !== 6}
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
