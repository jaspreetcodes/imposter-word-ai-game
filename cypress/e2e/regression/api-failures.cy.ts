/// <reference types="cypress" />

import { setup } from "../../support/screens/setup";
import { aiPanel } from "../../support/screens/aiPanel";

const MINI_ENDPOINT = "**/api/generate-words-mini";
const NICHE_ENDPOINT = "**/api/generate-niche-words";

/**
 * The word-gen API is a separate process that can be down, slow, or wrong.
 * These specs prove the UI degrades with a readable message instead of a blank
 * screen, and that the user can still play with the existing catalog.
 */
describe("Regression: word-gen API failure handling", () => {
  beforeEach(() => {
    cy.resetData();
    setup.visit();
    aiPanel.open();
  });

  it("blocks generation for a language the model does not support", () => {
    aiPanel.setLanguage("Somali");
    cy.dataCy("ai-unsupported-language").should("be.visible");
    cy.dataCy("ai-generate").should("be.disabled");
  });

  it("surfaces a server error message", () => {
    cy.intercept("POST", MINI_ENDPOINT, {
      statusCode: 500,
      fixture: "generate-words-server-error.json",
    }).as("miniFailure");

    aiPanel.generate();
    cy.wait("@miniFailure");
    aiPanel.error().should("contain.text", "Ollama runner terminated");
  });

  it("surfaces a client error when the request is rejected", () => {
    cy.intercept("POST", MINI_ENDPOINT, {
      statusCode: 400,
      body: {
        error: "Language not supported for AI generation",
        message: "Language not supported for AI generation",
        supportedLanguages: ["English", "French"],
      },
    }).as("miniRejected");

    aiPanel.generate();
    cy.wait("@miniRejected");
    aiPanel.error().should("contain.text", "Language not supported");
  });

  it("handles a malformed response body without crashing", () => {
    cy.intercept("POST", MINI_ENDPOINT, {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: "<html>not json</html>",
    }).as("miniMalformed");

    aiPanel.generate();
    cy.wait("@miniMalformed");
    aiPanel.error().should("be.visible");
    cy.dataCy("ai-panel").should("be.visible");
  });

  it("handles a network failure", () => {
    cy.intercept("POST", MINI_ENDPOINT, { forceNetworkError: true }).as("miniOffline");

    aiPanel.generate();
    cy.wait("@miniOffline");
    aiPanel.error().should("be.visible");
  });

  it("recovers from a slow generation without losing the panel", () => {
    cy.intercept("POST", MINI_ENDPOINT, {
      statusCode: 200,
      delay: 800,
      fixture: "generate-words-mini.json",
    }).as("miniSlow");

    aiPanel.generate();
    cy.dataCy("ai-generate").should("be.disabled");
    cy.wait("@miniSlow");
    cy.dataCy("ai-error").should("not.exist");
  });

  it("stays usable when the model returns no words", () => {
    cy.intercept("POST", MINI_ENDPOINT, {
      statusCode: 200,
      fixture: "generate-words-empty.json",
    }).as("miniEmpty");

    aiPanel.generate();
    cy.wait("@miniEmpty");
    cy.dataCy("ai-error").should("not.exist");
    cy.dataCy("ai-preview").should("not.exist");
    cy.dataCy("mode-random").should("be.visible");
  });

  it("validates a niche category before calling the API", () => {
    let called = false;
    cy.intercept("POST", NICHE_ENDPOINT, (req) => {
      called = true;
      req.reply({ statusCode: 200, body: { words: [] } });
    });

    aiPanel.chooseTab("niche");
    aiPanel.generateNiche("Food");

    aiPanel.error().should("be.visible");
    cy.then(() => expect(called, "reserved category never reaches the API").to.be.false);
  });
});
