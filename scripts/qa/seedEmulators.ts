/**
 * Reset the Firebase emulators and load the deterministic QA dataset.
 * Usage: npm run qa:seed            (reset + seed)
 *        npm run qa:seed -- --reset (reset only)
 */

import {
  clearAuthUsers,
  clearFirestore,
  countWords,
  createUser,
  emulatorEndpoints,
  emulatorsReachable,
  seedWords,
} from "./emulatorClient";
import { QA_USERS, QA_WORDS } from "./testData";

async function main(): Promise<void> {
  const resetOnly = process.argv.includes("--reset");
  const endpoints = emulatorEndpoints();

  if (!(await emulatorsReachable(endpoints))) {
    throw new Error(
      `Firebase emulators not reachable at firestore=${endpoints.firestoreHost} auth=${endpoints.authHost}. Start them with: npm run emulators`
    );
  }

  await clearFirestore(endpoints);
  await clearAuthUsers(endpoints);
  console.log(`Reset emulator data for project ${endpoints.projectId}`);

  if (resetOnly) return;

  const seeded = await seedWords(QA_WORDS, endpoints);
  await createUser(QA_USERS.existing, endpoints);

  console.log(`Seeded ${seeded} words (${await countWords(endpoints)} in store)`);
  console.log(`Seeded user ${QA_USERS.existing.email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
