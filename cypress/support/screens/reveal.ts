/// <reference types="cypress" />

/** Final screen naming the Mafia player(s). */
export const reveal = {
  result() {
    return cy.dataCy("mafia-result");
  },

  expectMafia(playerIds: number[]) {
    const expected =
      playerIds.length === 1
        ? `Player ${playerIds[0]}`
        : `Players: ${[...playerIds].sort((a, b) => a - b).join(", ")}`;
    reveal.result().should("have.text", expected);
  },

  startNewGame() {
    cy.dataCy("new-game").click();
    cy.location("pathname").should("eq", "/setup");
  },
};
