/// <reference types="cypress" />

import type { SeedUser, SeedWord } from "../../scripts/qa/testData";

export interface TestHookOptions {
  /** Pins word choice and Mafia assignment. Pass null to keep real randomness. */
  seed?: number | null;
  /** Shortens the reveal auto-hide timer so specs never wait 10 seconds. */
  revealTimeoutMs?: number;
}

export interface RevealedCard {
  playerId: number;
  text: string;
  isMafia: boolean;
}

const DEFAULT_SEED = 20240101;
const DEFAULT_REVEAL_TIMEOUT_MS = 60_000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visit a route with the deterministic test hooks installed. */
      visitApp(path?: string, options?: TestHookOptions): Chainable<void>;
      /** Wipe emulator data and reload the deterministic dataset. */
      resetData(words?: SeedWord[]): Chainable<void>;
      /** Add words on top of the current dataset. */
      seedExtraWords(words: SeedWord[]): Chainable<void>;
      createTestUser(user: SeedUser): Chainable<void>;
      /** Select by `data-cy`, the project's stable test selector. */
      dataCy(name: string): Chainable<JQuery<HTMLElement>>;
      /** Walk every player card through the reveal screen and collect what it showed. */
      revealAllPlayers(playerCount: number): Chainable<RevealedCard[]>;
    }
  }
}

Cypress.Commands.add("visitApp", (path = "/", options: TestHookOptions = {}) => {
  const seed = options.seed === undefined ? DEFAULT_SEED : options.seed;
  const hooks: Record<string, number> = {
    revealTimeoutMs: options.revealTimeoutMs ?? DEFAULT_REVEAL_TIMEOUT_MS,
  };
  if (seed !== null) hooks.seed = seed;

  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.clear();
      (win as unknown as { __MAFIA_TEST__: unknown }).__MAFIA_TEST__ = hooks;
    },
  });
});

Cypress.Commands.add("resetData", (words?: SeedWord[]) => {
  cy.task("resetData", words ?? null, { timeout: 60_000 });
});

Cypress.Commands.add("seedExtraWords", (words: SeedWord[]) => {
  cy.task("seedExtraWords", words, { timeout: 60_000 });
});

Cypress.Commands.add("createTestUser", (user: SeedUser) => {
  cy.task("createUser", user, { timeout: 30_000 });
});

Cypress.Commands.add("dataCy", (name: string) => cy.get(`[data-cy="${name}"]`));

Cypress.Commands.add("revealAllPlayers", (playerCount: number) => {
  const revealed: RevealedCard[] = [];

  for (let playerId = 1; playerId <= playerCount; playerId++) {
    cy.get(`[data-cy="player-card"][data-player-id="${playerId}"]`).click();
    cy.dataCy("player-reveal").should("have.attr", "data-player-id", String(playerId));
    cy.dataCy("player-word").then(($word) => {
      revealed.push({
        playerId,
        text: $word.text().trim(),
        isMafia: $word.attr("data-is-mafia") === "true",
      });
    });
    cy.dataCy("hide-and-pass").click();
    cy.dataCy("player-grid").should("be.visible");
  }

  cy.then(() => revealed);
});

export {};
