/// <reference types="cypress" />

import type { SeedUser } from "../../../scripts/qa/testData";

/** Email/password screens backed by the Firebase Auth emulator. */
export const auth = {
  visitSignIn(options?: Parameters<typeof cy.visitApp>[1]) {
    cy.visitApp("/login", options);
    cy.dataCy("sign-in-form").should("be.visible");
  },

  visitSignUp(options?: Parameters<typeof cy.visitApp>[1]) {
    cy.visitApp("/signup", options);
    cy.dataCy("sign-up-form").should("be.visible");
  },

  signIn(email: string, password: string) {
    cy.dataCy("auth-email").clear().type(email);
    cy.dataCy("auth-password").clear().type(password, { log: false });
    cy.dataCy("auth-submit").click();
  },

  signUp(user: SeedUser) {
    cy.dataCy("auth-display-name").clear().type(user.displayName);
    cy.dataCy("auth-email").clear().type(user.email);
    cy.dataCy("auth-password").clear().type(user.password, { log: false });
    cy.dataCy("auth-submit").click();
  },

  expectSignedIn() {
    cy.dataCy("nav-profile").should("be.visible");
  },

  expectSignedOut() {
    cy.dataCy("nav-sign-in").should("be.visible");
  },

  signOut() {
    cy.dataCy("nav-profile").click();
    cy.dataCy("nav-sign-out").click();
    auth.expectSignedOut();
  },
};
