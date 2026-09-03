/// <reference types="cypress" />

/** Pass-the-phone board: one card per player, then the Mafia reveal. */
export const game = {
  cards() {
    return cy.get('[data-cy="player-card"]');
  },

  expectPlayerCount(count: number) {
    cy.dataCy("game-player-count").should("have.text", String(count));
    game.cards().should("have.length", count);
  },

  openCard(playerId: number) {
    cy.get(`[data-cy="player-card"][data-player-id="${playerId}"]`).click();
  },

  expectCardLocked(playerId: number) {
    cy.get(`[data-cy="player-card"][data-player-id="${playerId}"]`)
      .should("have.attr", "data-revealed", "true")
      .and("be.disabled");
  },

  dismissStartSuggestion() {
    cy.dataCy("start-suggestion").should("be.visible");
    cy.dataCy("start-suggestion-continue").click();
    cy.dataCy("start-suggestion").should("not.exist");
  },

  revealMafia() {
    cy.dataCy("reveal-mafia").click();
    cy.location("pathname").should("eq", "/reveal-mafia");
  },

  changePlayers() {
    cy.dataCy("change-players").click();
    cy.dataCy("change-players-dialog").should("be.visible");
  },

  confirmChangePlayers() {
    cy.dataCy("change-players-confirm").click();
    cy.location("pathname").should("eq", "/setup");
  },
};
