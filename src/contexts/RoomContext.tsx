/**
 * Room Context
 * Manages current room state with real-time Firestore listeners
 */

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  subscribeToRoom,
  subscribeToRoomPlayers,
  subscribeToPlayer,
  getRoomById,
  getPlayerData,
  type RoomDocument,
  type RoomPlayerDocument,
} from "../services/roomService";

export interface RoomContextType {
  currentRoomId: string | null;
  room: RoomDocument | null;
  players: RoomPlayerDocument[];
  currentPlayer: RoomPlayerDocument | null;
  isLoading: boolean;
  error: string | null;
  setCurrentRoomId: (roomId: string | null) => void;
  refreshRoom: () => Promise<void>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [players, setPlayers] = useState<RoomPlayerDocument[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<RoomPlayerDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to room changes
  useEffect(() => {
    if (!currentRoomId) {
      setRoom(null);
      setPlayers([]);
      setCurrentPlayer(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to room document
    const unsubscribeRoom = subscribeToRoom(currentRoomId, (roomData) => {
      setRoom(roomData);
      setIsLoading(false);
    });

    // Subscribe to players collection
    const unsubscribePlayers = subscribeToRoomPlayers(currentRoomId, (playersList) => {
      setPlayers(playersList);
    });

    // Subscribe to current player if user is logged in
    let unsubscribePlayer: (() => void) | null = null;
    if (user) {
      unsubscribePlayer = subscribeToPlayer(currentRoomId, user.uid, (playerData) => {
        setCurrentPlayer(playerData);
      });
    }

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      if (unsubscribePlayer) {
        unsubscribePlayer();
      }
    };
  }, [currentRoomId, user]);

  // Refresh room data manually
  const refreshRoom = async () => {
    if (!currentRoomId) return;

    try {
      setIsLoading(true);
      const roomData = await getRoomById(currentRoomId);
      setRoom(roomData);

      if (user) {
        const playerData = await getPlayerData(currentRoomId, user.uid);
        setCurrentPlayer(playerData);
      }
    } catch (err: any) {
      console.error("Error refreshing room:", err);
      setError(err.message || "Failed to refresh room");
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<RoomContextType>(
    () => ({
      currentRoomId,
      room,
      players,
      currentPlayer,
      isLoading,
      error,
      setCurrentRoomId,
      refreshRoom,
    }),
    [currentRoomId, room, players, currentPlayer, isLoading, error]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within RoomProvider");
  }
  return context;
}
