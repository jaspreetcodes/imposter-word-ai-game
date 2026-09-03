# Defect log

Open and recently closed defects found by the QA suites. Use
[DEFECT_TEMPLATE.md](DEFECT_TEMPLATE.md) for new entries.

| ID | Summary | Severity | Status | Reproduction |
| --- | --- | --- | --- | --- |
| DEF-001 | The same secret word can be drawn in consecutive rounds | Medium | Open | `cypress/e2e/known-defects/repeated-word.cy.ts` |

---

## DEF-001 — The same secret word can be drawn in consecutive rounds

| Field | Value |
| --- | --- |
| Status | Open |
| Severity | Medium |
| Priority | P2 |
| Reported | 2026-08-04, QA automation |
| Build | local test build (`npm run build:e2e`) |
| Environment | Local test (Firebase emulators, seeded dataset) |
| Component | Gameplay / word selection |
| Found by | Automated — `cypress/e2e/known-defects/repeated-word.cy.ts` |
| Owner | Unassigned |

### Preconditions

- Firebase emulators running and seeded with a two-word pool for
  Punjabi / Punjab (`cy.resetData(TINY_POOL)` in the spec).
- Real randomness (the spec visits with `{ seed: null }`), because a fixed seed
  would prove nothing about production behaviour.

### Steps to reproduce

1. Seed exactly two words in one category for Punjabi / Punjab.
2. Open `/setup`, set the player count to 3, and select Punjabi / Punjab.
3. Start a random round and reveal all three cards; note the crew word.
4. Choose "Change Players", confirm, and start another round with the same
   settings.
5. Repeat for eight rounds and compare each round's word with the previous one.

### Expected result

Consecutive rounds should not reuse the same secret word while an unused word
remains in the pool. Replaying a word the group has already discussed removes
the guessing challenge, which is the point of the game.

### Actual result

Words repeat immediately and often. A recorded run drew:

```
sarson → makki → makki → sarson → sarson → sarson → sarson → sarson
```

That is 5 immediate repeats across 7 transitions.

```
AssertionError: secret words drawn in order: sarson → makki → makki → sarson →
sarson → sarson → sarson → sarson: expected [ Array(5) ] to have a length of 0
but got 5
  at Context.eval (cypress/e2e/known-defects/repeated-word.cy.ts:65:16)
```

### Root cause (initial analysis)

`pickCategoryAndWord` in `src/contexts/GameContext.tsx` picks uniformly at
random from the matching words and keeps no history of previous rounds, so
nothing prevents an immediate repeat. `resetGame` clears the whole game state,
including anything that could act as a memory.

### Evidence

- Spec: `cypress/e2e/known-defects/repeated-word.cy.ts`
- Screenshot and video: produced by the `known-defects` job of the
  **Nightly regression** workflow, uploaded as the `known-defect-evidence`
  artifact.

### Impact

Any small word pool: a newly generated locale, a niche category, or a single
selected category. The group replays a word they already solved. There is a
workaround — select more categories — but players will not know that.

### Suggested fix

Track recently used words per locale (session-scoped is enough for local play)
and exclude them from selection until the pool is exhausted, then reset the
history.

### Fix reference

_Not yet fixed._

### Retest result

| Field | Value |
| --- | --- |
| Retested on | — |
| Result | — |
| Regression test | Move the spec to `cypress/e2e/regression/` once it passes |
