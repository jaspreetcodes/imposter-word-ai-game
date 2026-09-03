/// <reference types="cypress" />

export type SetupMode = "random" | "custom" | "ai";

/** Pre-game screen: player count, word-source mode, locale, and categories. */
export const setup = {
  visit(options?: Parameters<typeof cy.visitApp>[1]) {
    cy.visitApp("/setup", options);
    cy.dataCy("player-count").should("be.visible");
  },

  setPlayers(target: number) {
    cy.dataCy("player-count").then(($count) => {
      const current = Number($count.text());
      const delta = target - current;
      const button = delta > 0 ? "player-increment" : "player-decrement";
      for (let i = 0; i < Math.abs(delta); i++) {
        cy.dataCy(button).click();
      }
    });
    cy.dataCy("player-count").should("have.text", String(target));
  },

  chooseMode(mode: SetupMode) {
    cy.dataCy(`mode-${mode}`).click().should("have.attr", "aria-selected", "true");
  },

  selectLocale(language: string, region: string) {
    cy.get(
      `[data-cy="locale-card"][data-language="${language}"][data-region="${region}"]`
    )
      .first()
      .click()
      .should("have.attr", "data-selected", "true");
  },

  selectCategory(category: string) {
    cy.get(`[data-cy="category-card"][data-category="${category}"]`)
      .click()
      .should("have.attr", "data-selected", "true");
  },

  categoryCards() {
    return cy.get('[data-cy="category-card"]');
  },

  waitForCategories() {
    cy.dataCy("categories-loading").should("not.exist");
  },

  startRandom() {
    cy.dataCy("start-random").click();
    cy.location("pathname").should("eq", "/game");
  },

  startCustom() {
    cy.dataCy("start-custom").click();
    cy.location("pathname").should("eq", "/game");
  },
};
