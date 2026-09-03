import { defineConfig } from "cypress";
import {
  clearAuthUsers,
  clearFirestore,
  countWords,
  createUser,
  emulatorEndpoints,
  seedWords,
} from "./scripts/qa/emulatorClient";
import { QA_USERS, QA_WORDS, type SeedUser, type SeedWord } from "./scripts/qa/testData";

const endpoints = emulatorEndpoints();

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://127.0.0.1:4173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    video: true,
    screenshotOnRunFailure: true,
    // One retry in CI absorbs infrastructure blips; local runs stay honest.
    retries: { runMode: 1, openMode: 0 },
    defaultCommandTimeout: 8000,
    requestTimeout: 15000,
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      apiUrl: process.env.CYPRESS_API_URL ?? "http://127.0.0.1:3001",
      firestoreHost: endpoints.firestoreHost,
      authHost: endpoints.authHost,
      projectId: endpoints.projectId,
    },
    setupNodeEvents(on) {
      on("task", {
        async resetData(words: SeedWord[] | null) {
          await clearFirestore(endpoints);
          await clearAuthUsers(endpoints);
          const toSeed = words ?? QA_WORDS;
          await seedWords(toSeed, endpoints);
          await createUser(QA_USERS.existing, endpoints);
          return { words: toSeed.length };
        },
        async seedExtraWords(words: SeedWord[]) {
          await seedWords(words, endpoints);
          return { words: words.length };
        },
        async createUser(user: SeedUser) {
          await createUser(user, endpoints);
          return null;
        },
        async wordCount() {
          return countWords(endpoints);
        },
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
