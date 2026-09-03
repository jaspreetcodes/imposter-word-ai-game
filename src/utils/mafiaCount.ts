/**
 * Mafia (imposter) count from player count.
 * 2–4 players → 1 mafia; 5+ → floor(players / 4) (~1 mafia per 4 crewmates).
 */
export function computeMafiaCount(playerCount: number): number {
  if (playerCount <= 1) return 0;
  if (playerCount <= 4) return 1;
  return Math.floor(playerCount / 4);
}
