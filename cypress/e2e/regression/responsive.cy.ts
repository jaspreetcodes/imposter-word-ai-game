/// <reference types="cypress" />

import { setup } from "../../support/screens/setup";
import { game } from "../../support/screens/game";
import { QA_LOCALES } from "../../../scripts/qa/testData";

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

/** Nothing may overflow the viewport horizontally; that is the usual mobile bug. */
function expectNoHorizontalOverflow() {
  cy.window().then((win) => {
    const doc = win.document.documentElement;
    expect(
      doc.scrollWidth,
      "page does not scroll sideways"
    ).to.be.at.most(doc.clientWidth + 1);
  });
}

/**
 * Focused responsive coverage: the controls people actually touch, at the three
 * breakpoints the layout switches on — not every spec at every size.
 */
describe("Regression: responsive layout", () => {
  before(() => {
    cy.resetData();
  });

  VIEWPORTS.forEach((viewport) => {
    describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
      });

      it("keeps the setup controls reachable", () => {
        setup.visit();
        cy.dataCy("player-count").should("be.visible");
        cy.dataCy("player-increment").should("be.visible").click();
        cy.dataCy("mode-custom").should("be.visible");
        cy.dataCy("start-random").should("be.visible");
        expectNoHorizontalOverflow();
      });

      it("lays out the player grid and reveal screen", () => {
        setup.visit();
        setup.setPlayers(6);
        setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
        setup.startRandom();

        game.expectPlayerCount(6);
        game.cards().last().should("be.visible");
        expectNoHorizontalOverflow();

        game.openCard(1);
        cy.dataCy("player-word").should("be.visible");
        cy.dataCy("hide-and-pass").should("be.visible");
        expectNoHorizontalOverflow();
      });

      it("fits the change-players dialog inside the viewport", () => {
        setup.visit();
        setup.setPlayers(3);
        setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
        setup.startRandom();

        game.changePlayers();
        cy.dataCy("change-players-dialog").then(($dialog) => {
          const rect = $dialog[0].getBoundingClientRect();
          expect(rect.width, "dialog fits the viewport width").to.be.at.most(
            viewport.width
          );
        });
        cy.dataCy("change-players-cancel").should("be.visible").click();
        cy.dataCy("change-players-dialog").should("not.exist");
      });
    });
  });
});
