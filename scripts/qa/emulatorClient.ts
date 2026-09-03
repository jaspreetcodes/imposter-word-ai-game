/**
 * Thin REST client for the Firebase emulators.
 *
 * The emulators expose admin endpoints that bypass security rules, which is all
 * the QA suites need: wipe data, write the fixed word catalog, and create test
 * users. Using REST keeps this dependency-free so it runs the same in CI.
 */

import { QA_PROJECT_ID, wordDocId, type SeedUser, type SeedWord } from "./testData";

export interface EmulatorEndpoints {
  projectId: string;
  firestoreHost: string;
  authHost: string;
  apiKey: string;
}

export function emulatorEndpoints(
  overrides: Partial<EmulatorEndpoints> = {}
): EmulatorEndpoints {
  return {
    projectId: overrides.projectId ?? QA_PROJECT_ID,
    firestoreHost:
      overrides.firestoreHost ??
      process.env.FIRESTORE_EMULATOR_HOST ??
      "127.0.0.1:8080",
    authHost:
      overrides.authHost ??
      process.env.FIREBASE_AUTH_EMULATOR_HOST ??
      "127.0.0.1:9099",
    apiKey: overrides.apiKey ?? process.env.QA_FIREBASE_API_KEY ?? "demo-api-key",
  };
}

/** Firestore resource path, e.g. projects/x/databases/(default)/documents. */
function documentsPath(e: EmulatorEndpoints): string {
  return `projects/${e.projectId}/databases/(default)/documents`;
}

function documentsUrl(e: EmulatorEndpoints): string {
  return `http://${e.firestoreHost}/v1/${documentsPath(e)}`;
}

async function expectOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text();
  throw new Error(`${action} failed (${response.status}): ${body}`);
}

/** Firestore REST value encoding for the fields the word catalog uses. */
function toFirestoreFields(word: SeedWord): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    word: { stringValue: word.word },
    category: { stringValue: word.category },
    difficulty: { stringValue: word.difficulty },
    languages: {
      arrayValue: { values: word.languages.map((v) => ({ stringValue: v })) },
    },
    regions: {
      arrayValue: { values: word.regions.map((v) => ({ stringValue: v })) },
    },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  };
}

export async function clearFirestore(e = emulatorEndpoints()): Promise<void> {
  const url = `http://${e.firestoreHost}/emulator/v1/projects/${e.projectId}/databases/(default)/documents`;
  await expectOk(await fetch(url, { method: "DELETE" }), "Clear Firestore");
}

export async function clearAuthUsers(e = emulatorEndpoints()): Promise<void> {
  const url = `http://${e.authHost}/emulator/v1/projects/${e.projectId}/accounts`;
  await expectOk(await fetch(url, { method: "DELETE" }), "Clear Auth users");
}

/** Firestore caps a commit at 500 writes. */
const COMMIT_BATCH_SIZE = 400;

/**
 * Seeds through :commit rather than one POST per word. Cypress reseeds before
 * every test, so the difference between 1 request and 70 is the difference
 * between a fast suite and a slow, timeout-prone one.
 */
export async function seedWords(
  words: SeedWord[],
  e = emulatorEndpoints()
): Promise<number> {
  const base = documentsUrl(e);
  for (let start = 0; start < words.length; start += COMMIT_BATCH_SIZE) {
    const batch = words.slice(start, start + COMMIT_BATCH_SIZE);
    const response = await fetch(`${base}:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        writes: batch.map((word) => ({
          update: {
            name: `${documentsPath(e)}/words/${wordDocId(word.category, word.word)}`,
            fields: toFirestoreFields(word),
          },
        })),
      }),
    });
    await expectOk(response, `Seed ${batch.length} words`);
  }
  return words.length;
}

export async function createUser(
  user: SeedUser,
  e = emulatorEndpoints()
): Promise<void> {
  const url = `http://${e.authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${e.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      returnSecureToken: true,
    }),
  });
  await expectOk(response, `Create user ${user.email}`);
}

export async function countWords(e = emulatorEndpoints()): Promise<number> {
  const response = await fetch(`${documentsUrl(e)}/words?pageSize=1000`, {
    headers: { Authorization: "Bearer owner" },
  });
  await expectOk(response, "List words");
  const body = (await response.json()) as { documents?: unknown[] };
  return body.documents?.length ?? 0;
}

/** True when both emulators answer, used as a readiness probe before seeding. */
export async function emulatorsReachable(e = emulatorEndpoints()): Promise<boolean> {
  try {
    const [firestore, auth] = await Promise.all([
      fetch(`http://${e.firestoreHost}/`),
      fetch(`http://${e.authHost}/`),
    ]);
    return firestore.status < 500 && auth.status < 500;
  } catch {
    return false;
  }
}
