/**
 * Room Service
 * Handles game room creation, joining, and management with Firestore
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";
import { fetchWords, type WordFilters } from "./wordsService";
import { computeMafiaCount } from "../utils/mafiaCount";

export interface RoomDocument {
  roomCode: string;
  hostId: string;
  status: "waiting" | "playing" | "finished";
  gameSettings: {
    categories?: string[];
    languages?: string[];
    regions?: string[];
  };
  gameState: {
    categoryName: string | null;
    word: string | null;
    wordLanguage?: string | null; // language[0] of chosen word
    wordRegion?: string | null;   // region[0] / origin of chosen word
    /** @deprecated Prefer mafiaIds; kept for older clients */
    mafiaId: string | null;
    /** All mafia player document IDs (Firestore subcollection doc id) */
    mafiaIds?: string[];
    revealedPlayerIds: string[]; // UIDs
    suggestedStartPlayer?: number;
    roundDirection?: "clockwise" | "counter-clockwise";
    currentTurnPlayerNumber?: number; // whose turn to give a clue
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoomPlayerDocument {
  userId: string; // Firebase Auth UID
  displayName: string;
  playerNumber: number; // 1, 2, 3...
  isMafia: boolean;
  word: string | null; // Player's specific word (null if mafia)
  hasRevealed: boolean;
  joinedAt: Timestamp;
}

export interface RoomMessageDocument {
  userId: string;
  displayName: string;
  text: string;
  type: "chat" | "system";
  createdAt: Timestamp;
}

/**
 * Generate a unique 6-character room code
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if room code already exists
 */
async function roomCodeExists(roomCode: string): Promise<boolean> {
  try {
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("roomCode", "==", roomCode));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking room code:", error);
    return false;
  }
}

/**
 * Generate a unique room code (retries if collision)
 */
async function generateUniqueRoomCode(maxRetries = 10): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateRoomCode();
    const exists = await roomCodeExists(code);
    if (!exists) {
      return code;
    }
  }
  throw new Error("Failed to generate unique room code after multiple attempts");
}

/**
 * Create a new game room
 * Returns both roomCode and roomId
 */
export async function createRoom(
  hostId: string,
  displayName: string,
  settings?: {
    categories?: string[];
    languages?: string[];
    regions?: string[];
  }
): Promise<{ roomCode: string; roomId: string }> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const roomCode = await generateUniqueRoomCode();
  const roomId = doc(collection(db, "rooms")).id;

  const roomData: RoomDocument = {
    roomCode,
    hostId,
    status: "waiting",
    gameSettings: {
      categories: settings?.categories,
      languages: settings?.languages,
      regions: settings?.regions,
    },
    gameState: {
      categoryName: null,
      word: null,
      mafiaId: null,
      revealedPlayerIds: [],
    },
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  // Create room document
  await setDoc(doc(db, "rooms", roomId), roomData);

  // Add host as first player
  await joinRoom(roomCode, hostId, displayName);

  return { roomCode, roomId };
}

/**
 * Join a room by room code
 */
export async function joinRoom(
  roomCode: string,
  userId: string,
  displayName: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  // Find room by code
  const roomsRef = collection(db, "rooms");
  const q = query(roomsRef, where("roomCode", "==", roomCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("Room not found");
  }

  const roomDoc = snapshot.docs[0];
  const roomData = roomDoc.data() as RoomDocument;
  const roomId = roomDoc.id;

  // Check if room is full (max 25 players)
  const playersRef = collection(db, "rooms", roomId, "players");
  const playersSnapshot = await getDocs(playersRef);
  const currentPlayerCount = playersSnapshot.size;

  if (currentPlayerCount >= 25) {
    throw new Error("Room is full (max 25 players)");
  }

  // Check if player already in room
  const existingPlayer = playersSnapshot.docs.find(
    (doc) => doc.data().userId === userId
  );

  if (existingPlayer) {
    // Player already in room, just return
    return;
  }

  // Check room status
  if (roomData.status !== "waiting") {
    throw new Error("Room is not accepting new players");
  }

  // Add player to room
  const playerNumber = currentPlayerCount + 1;
  const playerData: RoomPlayerDocument = {
    userId,
    displayName,
    playerNumber,
    isMafia: false, // Will be assigned when game starts
    word: null,
    hasRevealed: false,
    joinedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(doc(db, "rooms", roomId, "players", userId), playerData);

  // Update room's updatedAt
  await updateDoc(doc(db, "rooms", roomId), {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Leave a room
 */
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const playerRef = doc(db, "rooms", roomId, "players", userId);
  await deleteDoc(playerRef);

  // Check if room is empty or if host left
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (roomSnap.exists()) {
    const roomData = roomSnap.data() as RoomDocument;
    const playersRef = collection(db, "rooms", roomId, "players");
    const playersSnapshot = await getDocs(playersRef);

    if (playersSnapshot.empty) {
      // Room is empty, delete it
      await deleteDoc(roomRef);
    } else if (roomData.hostId === userId) {
      // Host left, transfer to first available player
      const firstPlayer = playersSnapshot.docs[0];
      const newHostId = firstPlayer.data().userId;
      await updateDoc(roomRef, {
        hostId: newHostId,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Just update timestamp
      await updateDoc(roomRef, {
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Start the game (host only)
 * Picks word, assigns mafia, updates room status
 */
export async function startGame(roomId: string, hostId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("Room not found");
  }

  const roomData = roomSnap.data() as RoomDocument;

  // Verify host
  if (roomData.hostId !== hostId) {
    throw new Error("Only the host can start the game");
  }

  // Get all players
  const playersRef = collection(db, "rooms", roomId, "players");
  const playersSnapshot = await getDocs(playersRef);
  const players = playersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string } & RoomPlayerDocument>;

  if (players.length < 2) {
    throw new Error("Need at least 2 players to start");
  }

  // Pick word and category
  const filters: WordFilters = {
    categories: roomData.gameSettings.categories,
    languages: roomData.gameSettings.languages,
    regions: roomData.gameSettings.regions,
  };

  const words = await fetchWords(filters);

  if (words.length === 0) {
    throw new Error(
      "No words found for selected filters. Please change game settings."
    );
  }

  // Group words by category (keep full doc for language/region)
  const wordsByCategory: Record<string, typeof words> = {};
  words.forEach((wordDoc) => {
    if (!wordsByCategory[wordDoc.category]) {
      wordsByCategory[wordDoc.category] = [];
    }
    wordsByCategory[wordDoc.category].push(wordDoc);
  });

  const categories = Object.keys(wordsByCategory);
  const randomCategory =
    categories[Math.floor(Math.random() * categories.length)];
  const categoryDocs = wordsByCategory[randomCategory];
  const chosenDoc = categoryDocs[Math.floor(Math.random() * categoryDocs.length)];
  const selectedWord = chosenDoc.word;
  const wordLanguage = chosenDoc.languages?.[0] ?? null;
  const wordRegion = chosenDoc.regions?.[0] ?? null;

  const mafiaSlots = computeMafiaCount(players.length);
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const mafiaPlayers = shuffled.slice(0, mafiaSlots);
  const mafiaIdSet = new Set(mafiaPlayers.map((p) => p.id));

  // Generate suggested start player (non-mafia) and direction
  const nonMafiaPlayers = players.filter((p) => !mafiaIdSet.has(p.id));
  const suggestedStartPlayer =
    nonMafiaPlayers.length > 0
      ? nonMafiaPlayers[Math.floor(Math.random() * nonMafiaPlayers.length)]
          .playerNumber
      : 1;
  const roundDirection =
    Math.random() < 0.5 ? "clockwise" : "counter-clockwise";

  // Update all players with their words
  const batch = writeBatch(db);
  players.forEach((player) => {
    const playerRef = doc(db, "rooms", roomId, "players", player.id);
    if (mafiaIdSet.has(player.id)) {
      batch.update(playerRef, {
        isMafia: true,
        word: null,
      });
    } else {
      batch.update(playerRef, {
        isMafia: false,
        word: selectedWord,
      });
    }
  });

  // Update room state (currentTurnPlayerNumber = suggested start so chat shows whose turn)
  batch.update(roomRef, {
    status: "playing",
    "gameState.categoryName": randomCategory,
    "gameState.word": selectedWord,
    "gameState.wordLanguage": wordLanguage,
    "gameState.wordRegion": wordRegion,
    "gameState.mafiaId": mafiaPlayers[0]?.id ?? null,
    "gameState.mafiaIds": mafiaPlayers.map((p) => p.id),
    "gameState.revealedPlayerIds": [],
    "gameState.suggestedStartPlayer": suggestedStartPlayer,
    "gameState.roundDirection": roundDirection,
    "gameState.currentTurnPlayerNumber": suggestedStartPlayer,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Mark a player as having revealed their card
 */
export async function markPlayerRevealed(
  roomId: string,
  playerId: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const playerRef = doc(db, "rooms", roomId, "players", playerId);
  await updateDoc(playerRef, {
    hasRevealed: true,
  });

  // Update room's revealedPlayerIds
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (roomSnap.exists()) {
    const roomData = roomSnap.data() as RoomDocument;
    const revealedIds = roomData.gameState.revealedPlayerIds || [];

    if (!revealedIds.includes(playerId)) {
      await updateDoc(roomRef, {
        "gameState.revealedPlayerIds": [...revealedIds, playerId],
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Get room by code
 */
export async function getRoomByCode(
  roomCode: string
): Promise<{ roomId: string; room: RoomDocument } | null> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const roomsRef = collection(db, "rooms");
  const q = query(roomsRef, where("roomCode", "==", roomCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const roomDoc = snapshot.docs[0];
  return {
    roomId: roomDoc.id,
    room: roomDoc.data() as RoomDocument,
  };
}

/**
 * Get room by ID
 */
export async function getRoomById(
  roomId: string
): Promise<RoomDocument | null> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return null;
  }

  return roomSnap.data() as RoomDocument;
}

/**
 * Get all players in a room
 */
export async function getRoomPlayers(
  roomId: string
): Promise<RoomPlayerDocument[]> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const playersRef = collection(db, "rooms", roomId, "players");
  const snapshot = await getDocs(playersRef);

  return snapshot.docs.map((doc) => doc.data() as RoomPlayerDocument);
}

/**
 * Get current player's data from room
 */
export async function getPlayerData(
  roomId: string,
  userId: string
): Promise<RoomPlayerDocument | null> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }

  const playerRef = doc(db, "rooms", roomId, "players", userId);
  const playerSnap = await getDoc(playerRef);

  if (!playerSnap.exists()) {
    return null;
  }

  return playerSnap.data() as RoomPlayerDocument;
}

/**
 * Subscribe to room changes (real-time)
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: RoomDocument | null) => void
): Unsubscribe {
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RoomDocument);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to room players changes (real-time)
 */
export function subscribeToRoomPlayers(
  roomId: string,
  callback: (players: RoomPlayerDocument[]) => void
): Unsubscribe {
  const playersRef = collection(db, "rooms", roomId, "players");
  return onSnapshot(playersRef, (snapshot) => {
    const players = snapshot.docs.map(
      (doc) => doc.data() as RoomPlayerDocument
    );
    // Sort by player number
    players.sort((a, b) => a.playerNumber - b.playerNumber);
    callback(players);
  });
}

/**
 * Subscribe to specific player changes (real-time)
 */
export function subscribeToPlayer(
  roomId: string,
  userId: string,
  callback: (player: RoomPlayerDocument | null) => void
): Unsubscribe {
  const playerRef = doc(db, "rooms", roomId, "players", userId);
  return onSnapshot(playerRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RoomPlayerDocument);
    } else {
      callback(null);
    }
  });
}

/**
 * Send a chat message to the room
 */
export async function sendMessage(
  roomId: string,
  userId: string,
  displayName: string,
  text: string
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }
  const messagesRef = collection(db, "rooms", roomId, "messages");
  await setDoc(doc(messagesRef), {
    userId,
    displayName,
    text: text.trim().slice(0, 500),
    type: "chat",
    createdAt: serverTimestamp(),
  } as Omit<RoomMessageDocument, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> });
}

/**
 * Subscribe to room messages (real-time)
 */
export function subscribeRoomMessages(
  roomId: string,
  callback: (messages: RoomMessageDocument[]) => void
): Unsubscribe {
  const messagesRef = collection(db, "rooms", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => d.data() as RoomMessageDocument);
    callback(messages);
  });
}

/**
 * Advance turn to next player (host only). Used during clue rounds.
 */
export async function advanceTurn(roomId: string, hostId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured");
  }
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error("Room not found");
  }
  const roomData = roomSnap.data() as RoomDocument;
  if (roomData.hostId !== hostId) {
    throw new Error("Only the host can advance turn");
  }
  const playersRef = collection(db, "rooms", roomId, "players");
  const playersSnapshot = await getDocs(playersRef);
  const players = playersSnapshot.docs.map((d) => d.data() as RoomPlayerDocument).sort((a, b) => a.playerNumber - b.playerNumber);
  const current = roomData.gameState.currentTurnPlayerNumber ?? roomData.gameState.suggestedStartPlayer ?? 1;
  const direction = roomData.gameState.roundDirection === "counter-clockwise" ? -1 : 1;
  const currentIndex = players.findIndex((p) => p.playerNumber === current);
  let nextIndex = currentIndex + direction;
  if (nextIndex >= players.length) nextIndex = 0;
  if (nextIndex < 0) nextIndex = players.length - 1;
  const nextPlayerNumber = players[nextIndex].playerNumber;
  await updateDoc(roomRef, {
    "gameState.currentTurnPlayerNumber": nextPlayerNumber,
    updatedAt: serverTimestamp(),
  });
}
