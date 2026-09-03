/// <reference types="cypress" />

import { setup } from "../../support/screens/setup";
import { game } from "../../support/screens/game";
import { QA_LOCALES } from "../../../scripts/qa/testData";

const GAME_STATE_KEY = "mafiasword_game_state";

/**
 * Game state lives in sessionStorage. These specs cover the recovery paths a
 * support ticket would describe: stale state, corrupted state, and deep links
 * into a game that no longer exists.
 */
describe("Regression: session state and recovery", () => {
  beforeEach(() => {
    cy.resetData();
  });

  it("redirects to setup when a game route is opened with no active game", () => {
    cy.visitApp("/game");
    cy.location("pathname").should("eq", "/setup");
  });

  it("recovers from corrupted session state instead of showing a blank page", () => {
    cy.visitApp("/setup", { seed: 7 });
    cy.window().then((win) => {
      win.sessionStorage.setItem(GAME_STATE_KEY, "{not-valid-json");
    });

    cy.reload();
    cy.dataCy("player-count").should("be.visible");
  });

  it("ignores a stored game that has no players", () => {
    cy.visitApp("/setup");
    cy.window().then((win) => {
      win.sessionStorage.setItem(
        GAME_STATE_KEY,
        JSON.stringify({ players: 0, mafiaIds: [], revealedIds: [] })
      );
    });

    cy.visitApp("/game");
    cy.location("pathname").should("eq", "/setup");
  });

  it("clears the round when the player count is changed mid-game", () => {
    setup.visit();
    setup.setPlayers(3);
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.startRandom();

    game.openCard(1);
    cy.dataCy("hide-and-pass").click();
    game.expectCardLocked(1);

    game.changePlayers();
    game.confirmChangePlayers();

    setup.setPlayers(4);
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.startRandom();

    game.expectPlayerCount(4);
    cy.get('[data-cy="player-card"][data-revealed="true"]').should("not.exist");
  });
});
