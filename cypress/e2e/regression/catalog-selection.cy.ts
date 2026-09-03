/// <reference types="cypress" />

import { setup } from "../../support/screens/setup";
import { game } from "../../support/screens/game";
import {
  QA_COVERED_CATEGORIES,
  QA_LOCALES,
  QA_PARTIAL_CATEGORIES,
} from "../../../scripts/qa/testData";

const UNIVERSAL_ONLY = "Colors & Shades";

describe("Regression: category and locale selection", () => {
  beforeEach(() => {
    cy.resetData();
    setup.visit();
    setup.chooseMode("custom");
  });

  it("offers only culture-rich categories for a non-English locale", () => {
    setup.selectLocale(QA_LOCALES.covered.language, QA_LOCALES.covered.region);
    setup.waitForCategories();

    setup.categoryCards().should("have.length", QA_COVERED_CATEGORIES.length);
    QA_COVERED_CATEGORIES.forEach((category) => {
      cy.get(`[data-cy="category-card"][data-category="${category}"]`).should("exist");
    });
    cy.get(`[data-cy="category-card"][data-category="${UNIVERSAL_ONLY}"]`).should(
      "not.exist"
    );
  });

  it("offers universal categories for English and shows the seeded word counts", () => {
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.waitForCategories();

    setup.categoryCards().should("have.length", QA_PARTIAL_CATEGORIES.length);
    cy.get(`[data-cy="category-card"][data-category="${UNIVERSAL_ONLY}"]`)
      .should("exist")
      .and("contain.text", "5 words");
  });

  it("draws the secret word from the selected category only", () => {
    setup.selectLocale(QA_LOCALES.covered.language, QA_LOCALES.covered.region);
    setup.waitForCategories();
    setup.selectCategory("Food");
    setup.setPlayers(3);
    setup.startCustom();

    cy.dataCy("word-error").should("not.exist");
    game.openCard(1);
    cy.dataCy("player-category").should("contain.text", "Food");
  });

  it("shows the empty-pool message for a locale with no words", () => {
    setup.selectLocale(QA_LOCALES.empty.language, QA_LOCALES.empty.region);
    setup.waitForCategories();

    cy.dataCy("empty-pool").should("be.visible");
    setup.categoryCards().should("not.exist");
    cy.dataCy("start-custom").should("be.disabled");
  });

  it("clears the category selection when the locale changes", () => {
    setup.selectLocale(QA_LOCALES.covered.language, QA_LOCALES.covered.region);
    setup.waitForCategories();
    setup.selectCategory("Music");

    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.waitForCategories();

    cy.get('[data-cy="category-card"][data-selected="true"]').should("not.exist");
    cy.dataCy("start-custom").should("be.disabled");
  });

  it("shows player-friendly labels on category cards without infra terms", () => {
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.waitForCategories();

    setup.categoryCards().each(($card) => {
      const text = $card.text();
      expect(text).to.not.match(/Firestore/i);
      expect(text).to.not.match(/AI\//i);
      expect(text).to.match(/\d+ words?/);
    });
  });
});
