/**
 * Room chat: messages list, input, optional turn banner and next-turn button.
 * Use in waiting room (lobby chat) and game page (clues + turn prompts).
 */

import { useEffect, useState, useRef } from "react";
import {
  subscribeRoomMessages,
  sendMessage as sendMessageToFirestore,
  advanceTurn,
  type RoomMessageDocument,
  type RoomPlayerDocument,
} from "../services/roomService";
import { UI_STRINGS } from "../constants/strings";
import styles from "./RoomChat.module.css";

type Props = {
  roomId: string;
  userId: string;
  displayName: string;
  players: RoomPlayerDocument[];
  isHost?: boolean;
  /** During game: show "It's X's turn" and optional Next turn button */
  showTurnBanner?: boolean;
  currentTurnPlayerNumber?: number;
  roundDirection?: "clockwise" | "counter-clockwise";
};

export default function RoomChat({
  roomId,
  userId,
  displayName,
  players,
  isHost = false,
  showTurnBanner = false,
  currentTurnPlayerNumber,
}: Props) {
  const [messages, setMessages] = useState<RoomMessageDocument[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeRoomMessages(roomId, setMessages);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessageToFirestore(roomId, userId, displayName, text);
      setInput("");
    } catch (err) {
      console.error("Send message failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleAdvanceTurn = async () => {
    if (!isHost || advancing) return;
    setAdvancing(true);
    try {
      await advanceTurn(roomId, userId);
    } catch (err) {
      console.error("Advance turn failed:", err);
    } finally {
      setAdvancing(false);
    }
  };

  const currentTurnPlayer = currentTurnPlayerNumber != null
    ? players.find((p) => p.playerNumber === currentTurnPlayerNumber)
    : null;
  const isMyTurn = currentTurnPlayer?.userId === userId;

  return (
    <div className={styles.chat}>
      <h3 className={styles.chatTitle}>{UI_STRINGS.CHAT_TITLE}</h3>

      {showTurnBanner && currentTurnPlayer && (
        <div className={`${styles.turnBanner} ${isMyTurn ? styles.yourTurn : ""}`}>
          {isMyTurn
            ? UI_STRINGS.CHAT_TURN_YOUR_TURN
            : UI_STRINGS.CHAT_TURN_PROMPT.replace("{name}", currentTurnPlayer.displayName)}
          {isHost && (
            <button
              type="button"
              onClick={handleAdvanceTurn}
              disabled={advancing}
              className={styles.nextTurnBtn}
            >
              {advancing ? "..." : UI_STRINGS.CHAT_NEXT_TURN}
            </button>
          )}
        </div>
      )}

      <div className={styles.messagesList} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.empty}>{UI_STRINGS.CHAT_EMPTY}</div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={msg.type === "system" ? styles.messageSystem : styles.message}
            >
              {msg.type === "chat" && (
                <span className={styles.messageSender}>{msg.displayName}: </span>
              )}
              <span className={styles.messageText}>{msg.text}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.inputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={UI_STRINGS.CHAT_PLACEHOLDER}
          className={styles.input}
          maxLength={500}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className={styles.sendBtn}
        >
          {UI_STRINGS.CHAT_SEND}
        </button>
      </div>
    </div>
  );
}
