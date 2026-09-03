/// <reference types="cypress" />

/** Landing page: rules, AI blurb, and the two entry points. */
export const home = {
  visit(options?: Parameters<typeof cy.visitApp>[1]) {
    cy.visitApp("/", options);
    cy.dataCy("play-local").should("be.visible");
  },

  startLocalGame() {
    cy.dataCy("play-local").click();
    cy.location("pathname").should("eq", "/setup");
  },

  goToSignIn() {
    cy.dataCy("home-sign-in").click();
    cy.location("pathname").should("eq", "/login");
  },
};
