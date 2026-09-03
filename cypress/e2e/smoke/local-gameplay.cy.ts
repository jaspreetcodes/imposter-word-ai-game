/// <reference types="cypress" />

import { home } from "../../support/screens/home";
import { setup } from "../../support/screens/setup";
import { game } from "../../support/screens/game";
import { reveal } from "../../support/screens/reveal";
import { QA_LOCALES } from "../../../scripts/qa/testData";

const PLAYERS = 4;

/**
 * Release smoke: the one journey that must always work — a guest opens the app,
 * sets up a local round, every player sees their card, and the Mafia is revealed.
 */
describe("Smoke: local pass-the-phone round", () => {
  before(() => {
    cy.resetData();
  });

  it("plays a full round from landing page to Mafia reveal and reset", () => {
    home.visit();
    home.startLocalGame();

    setup.setPlayers(PLAYERS);
    cy.dataCy("mafia-count").should("have.text", "1");

    setup.chooseMode("random");
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.startRandom();

    game.expectPlayerCount(PLAYERS);
    cy.dataCy("word-error").should("not.exist");

    cy.revealAllPlayers(PLAYERS).then((cards) => {
      const mafia = cards.filter((card) => card.isMafia);
      const crew = cards.filter((card) => !card.isMafia);

      expect(mafia, "exactly one Mafia for four players").to.have.length(1);
      expect(mafia[0].text).to.eq("You are the Mafia!");

      const distinctCrewWords = new Set(crew.map((card) => card.text));
      expect(distinctCrewWords.size, "crew all share one secret word").to.eq(1);
      expect([...distinctCrewWords][0]).to.not.be.empty;

      // Every card is single-use so a player cannot peek twice.
      cards.forEach((card) => game.expectCardLocked(card.playerId));

      game.dismissStartSuggestion();
      game.revealMafia();
      reveal.expectMafia([mafia[0].playerId]);
    });

    reveal.startNewGame();
    cy.dataCy("player-count").should("be.visible");
  });

  it("keeps the round consistent when the page is reloaded mid-game", () => {
    setup.visit();
    setup.setPlayers(3);
    setup.selectLocale(QA_LOCALES.partial.language, QA_LOCALES.partial.region);
    setup.startRandom();

    const seen: { text: string; isMafia: boolean }[] = [];
    const record = () =>
      cy.dataCy("player-word").then(($word) => {
        seen.push({
          text: $word.text().trim(),
          isMafia: $word.attr("data-is-mafia") === "true",
        });
      });

    game.openCard(1);
    record();
    cy.dataCy("hide-and-pass").click();

    cy.reload();
    game.expectPlayerCount(3);
    game.expectCardLocked(1);

    game.openCard(2);
    record();

    cy.then(() => {
      const crewWords = seen.filter((card) => !card.isMafia).map((card) => card.text);
      expect(new Set(crewWords).size, "secret word survives a reload").to.be.lessThan(2);
    });
  });
});
