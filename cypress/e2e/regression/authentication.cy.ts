/// <reference types="cypress" />

import { auth } from "../../support/screens/auth";
import { home } from "../../support/screens/home";
import { QA_USERS } from "../../../scripts/qa/testData";

/**
 * Authentication is optional in this game: local play must never require it.
 * Google OAuth is deliberately out of scope for CI (it needs a real provider);
 * only its entry point is checked.
 */
describe("Regression: optional authentication", () => {
  beforeEach(() => {
    cy.resetData();
  });

  it("signs in a seeded user and signs back out", () => {
    auth.visitSignIn();
    auth.signIn(QA_USERS.existing.email, QA_USERS.existing.password);

    cy.location("pathname").should("eq", "/");
    auth.expectSignedIn();

    auth.signOut();
    cy.dataCy("play-local").should("be.visible");
  });

  it("registers a new account and lands signed in", () => {
    auth.visitSignUp();
    auth.signUp(QA_USERS.newSignUp);

    cy.location("pathname").should("eq", "/");
    auth.expectSignedIn();
  });

  it("rejects a malformed email before calling the auth backend", () => {
    auth.visitSignIn();
    cy.dataCy("auth-email").type("not-an-email");
    cy.dataCy("auth-email-error").should("be.visible");
    cy.dataCy("auth-submit").should("be.disabled");
  });

  it("reports a failed sign-in without leaving the form", () => {
    auth.visitSignIn();
    auth.signIn(QA_USERS.existing.email, "WrongPassword123!");

    cy.dataCy("auth-error").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("exposes the Google entry point without triggering the OAuth popup", () => {
    auth.visitSignIn();
    cy.dataCy("auth-google").should("be.visible").and("not.be.disabled");
  });

  it("lets a guest play locally without signing in", () => {
    home.visit();
    auth.expectSignedOut();
    home.startLocalGame();
    cy.dataCy("player-count").should("be.visible");
  });
});
