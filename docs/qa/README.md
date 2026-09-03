# QA documentation

- [TEST_STRATEGY.md](TEST_STRATEGY.md) — layers, environments, test data,
  determinism, thresholds, and release exit criteria.
- [DEFECT_TEMPLATE.md](DEFECT_TEMPLATE.md) — how to write a defect report, plus
  the severity guide and evidence requirements.
- [DEFECTS.md](DEFECTS.md) — the current defect log.

## Quick reference

| Command | What it does |
| --- | --- |
| `npm test` | Unit and logic tests |
| `npm run emulators` | Firebase Auth + Firestore emulators (needs Java 17+) |
| `npm run qa:seed` | Reset the emulators and load the deterministic dataset |
| `npm run qa:reset` | Wipe emulator data without seeding |
| `npm run qa:ollama-stub` | Deterministic replacement for the Ollama model host |
| `npm run api:test` | Newman API contract suite (writes `reports/newman/`) |
| `npm run build:e2e` | Build with test hooks and emulator config |
| `npm run e2e:ci` | Serve the build and run the Cypress smoke suite |
| `npm run cypress:open` | Interactive Cypress against a running preview server |
| `npm run e2e:regression` | Smoke plus full regression suites |
| `npm run e2e:known-defects` | Reproduce open defects (expected to fail) |
| `npm run load:smoke` | k6 catalog read and coverage load smoke |
| `npm run load:generation` | k6 generation reliability (real model host) |
| `npm run qa:summary <kind>` | Markdown summary of `newman`, `cypress`, or `k6` results |

## Layout

```
cypress/
  e2e/smoke/           release gate: the full pass-the-phone journey
  e2e/regression/      catalog, auth, API failures, session, responsive
  e2e/known-defects/   reproductions of accepted open defects
  fixtures/            canned API responses for failure paths
  support/commands.ts  visitApp, resetData, revealAllPlayers, dataCy
  support/screens/     helpers grouped by the screen a user sees
postman/               API contract collection and environments
k6/                    load and reliability scenarios
scripts/qa/            emulator seeding, model stub, CI report summaries
```
