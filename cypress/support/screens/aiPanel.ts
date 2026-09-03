/// <reference types="cypress" />

/** AI word generation panel inside the setup screen. */
export const aiPanel = {
  open() {
    cy.dataCy("mode-ai").click();
    cy.dataCy("ai-panel").should("be.visible");
  },

  chooseTab(tab: "locale" | "niche") {
    cy.dataCy(`ai-tab-${tab}`).click().should("have.attr", "aria-selected", "true");
  },

  setLanguage(language: string) {
    cy.dataCy("ai-language").clear().type(language);
    // The suggestion dropdown overlays the generate button; close it first.
    cy.dataCy("ai-language").type("{esc}");
  },

  setRegion(region: string) {
    cy.dataCy("ai-region").clear().type(region).type("{esc}");
  },

  generate() {
    cy.dataCy("ai-generate").click();
  },

  generateNiche(category: string) {
    cy.dataCy("ai-niche-category").clear().type(category);
    cy.dataCy("ai-niche-generate").click();
  },

  error() {
    return cy.dataCy("ai-error");
  },

  success() {
    return cy.dataCy("ai-success");
  },
};
