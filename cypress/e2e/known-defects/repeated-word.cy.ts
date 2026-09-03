/// <reference types="cypress" />

import { setup } from "../../support/screens/setup";
import { game } from "../../support/screens/game";
import type { SeedWord } from "../../../scripts/qa/testData";

/**
 * DEF-001 — the same secret word can be drawn in back-to-back rounds.
 *
 * Word selection picks uniformly at random with no memory of previous rounds,
 * so a small pool repeats immediately and the group replays a word they have
 * already discussed. This spec is the reproduction evidence; it is expected to
 * FAIL until repeated-word prevention ships, which is why it lives outside the
 * blocking suites. Move it into cypress/e2e/regression once the fix lands.
 *
 * See docs/qa/DEFECTS.md.
 */

const LANGUAGE = "Punjabi";
const REGION = "Punjab";
const ROUNDS = 8;

// A two-word pool makes an immediate repeat obvious and quick to reproduce.
const TINY_POOL: SeedWord[] = ["makki", "sarson"].map((word) => ({
  word,
  category: "Food",
  languages: [LANGUAGE],
  regions: [REGION],
  difficulty: "easy" as const,
}));

describe("Known defect DEF-001: repeated word across consecutive rounds", () => {
  before(() => {
    cy.resetData(TINY_POOL);
  });

  it("never shows the same secret word twice in a row", () => {
    // Real randomness on purpose: a fixed seed would prove nothing here.
    setup.visit({ seed: null });

    const crewWords: string[] = [];

    for (let round = 0; round < ROUNDS; round++) {
      setup.setPlayers(3);
      setup.selectLocale(LANGUAGE, REGION);
      setup.startRandom();

      cy.revealAllPlayers(3).then((cards) => {
        const crew = cards.find((card) => !card.isMafia);
        if (crew) crewWords.push(crew.text);
      });

      game.dismissStartSuggestion();
      game.changePlayers();
      game.confirmChangePlayers();
    }

    cy.then(() => {
      const repeats = crewWords.filter(
        (word, index) => index > 0 && word === crewWords[index - 1]
      );
      expect(
        repeats,
        `secret words drawn in order: ${crewWords.join(" → ")}`
      ).to.have.length(0);
    });
  });
});
