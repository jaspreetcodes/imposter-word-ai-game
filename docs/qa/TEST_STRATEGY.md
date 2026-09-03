# Test strategy

How this project is tested, what each layer is responsible for, and what has to
be green before a release.

## Test layers

| Layer | Tool | What it proves | Where it runs |
| --- | --- | --- | --- |
| Logic | `node:test` (`npm test`) | Pure functions: category taxonomy, locale matching, Mafia count, seeded randomness, word validation | Every pull request |
| Word data QA | `npm run word-qa`, `npm run word-qa:loanwords` | Generated words meet the catalog rules | Every pull request |
| API contract | Postman + Newman (`npm run api:test`) | The Express word-gen API's status codes, schemas, CORS, and error bodies | Every pull request |
| End-to-end | Cypress (`npm run e2e:smoke`, `npm run e2e:regression`) | Real browser journeys against a real build | Smoke on every pull request, full regression nightly |
| Load and reliability | k6 (`npm run load:smoke`, `npm run load:generation`) | Read-path response times and AI generation reliability | Nightly / on demand |

Each layer owns a distinct question. k6 does not repeat Newman's schema
assertions, and Newman does not repeat Cypress's user journeys.

## Environments

| Environment | Frontend | Firestore / Auth | Model host |
| --- | --- | --- | --- |
| Local development | `npm run dev` | Real Firebase project from `.env` | Local Ollama |
| Local test | `npm run build:e2e` + `npm run preview:e2e` (loads `.env.e2e`) | Firebase emulators | `npm run qa:ollama-stub` |
| CI | Same as local test | Firebase emulators | Ollama stub |
| Staging (scheduled) | Deployed build | Staging Firebase project | Real Ollama model |

Automated tests never point at production data. The emulator project id is
`demo-mafiasword`, which Firebase treats as a demo project and refuses to
connect to real cloud resources.

### Prerequisites

- Node 20+
- Java 17+ (the Firestore and Auth emulators are Java processes)
- k6, only for the load scenarios

## Test data

`scripts/qa/testData.ts` is the single source of truth for the QA dataset, and
every suite seeds from it. It defines three locales with different shapes so
tests can be exact rather than defensive:

| Locale | Contents | Used for |
| --- | --- | --- |
| Punjabi / Punjab | 5 words in each of the 10 culture-rich categories (50 total) | Coverage cache hit, culture-rich category filtering, load smoke |
| English / UK | 5 words in each of 4 categories (20 total) | Gameplay, universal-category behaviour, partial coverage |
| Spanish / Spain | none | Empty pool, coverage cache miss, generation path |
| Somali / Somalia | not a supported AI language | Language allowlist rejection |

Reset and reseed with `npm run qa:seed`; `npm run qa:reset` wipes without
seeding. Cypress re-seeds through the `resetData` task so specs never depend on
the order they run in.

## Determinism

Randomness and timers are the usual source of flaky UI tests, so both are
controllable in test builds:

- `window.__MAFIA_TEST__.seed` pins word choice, Mafia assignment, and the
  suggested starting player to a repeatable sequence.
- `window.__MAFIA_TEST__.revealTimeoutMs` overrides the 10-second auto-hide on
  the reveal screen.

These hooks only exist when the bundle is built with `VITE_E2E=true` (or served
by the dev server); a production build ignores them entirely. `cy.visitApp()`
installs them, and passing `{ seed: null }` opts back into real randomness for
specs that need to observe genuine variation.

AI generation is made deterministic by `scripts/qa/ollamaStub.ts`, which speaks
the Ollama `/api/chat` protocol and returns predictable word lists. That keeps
the real generation path under test — prompt building, parsing, judging,
coverage — without depending on a GPU host or model output.

## Smoke versus regression

**Smoke** (`cypress/e2e/smoke/`) is the release gate: one complete
pass-the-phone round and state survival across a reload. It runs on every pull
request and must always pass.

**Regression** (`cypress/e2e/regression/`) covers catalog selection,
authentication, API failure handling, session recovery, and responsive layouts.
It runs nightly and before a release.

**Known defects** (`cypress/e2e/known-defects/`) reproduce accepted open
defects. These specs are expected to fail; they run in a non-blocking job that
publishes fresh evidence. When a defect is fixed, its spec moves into
`regression/` and becomes a permanent guard.

## Quality thresholds

| Check | Threshold |
| --- | --- |
| Unit and word QA tests | 100% pass |
| Newman assertions | 100% pass |
| Cypress smoke | 100% pass, no retries needed |
| `/health` response time | < 500 ms |
| Catalog read and coverage p95 | < 1 s |
| Failed request rate under load smoke | < 1% |
| AI generation p95 (real model, staging) | < 60 s |
| Generation payload validity | 100% |

## Out of scope

- **Google OAuth**: needs a real provider and interactive consent. Only the
  entry point's presence is asserted; sign-in itself is manual pre-release.
- **Online multiplayer rooms**: room creation is disabled in the UI, so there is
  no end-to-end room journey to automate yet.
- **Concurrent LLM load**: running many parallel generations measures the
  model host's capacity, not an application regression, so the reliability
  scenario stays at one virtual user.
- **Visual regression**: layout is checked functionally (no horizontal
  overflow, controls reachable) rather than pixel by pixel.
- **Lint**: there is a pre-existing violation backlog, so lint runs in CI but
  does not block. Do not add new violations in changed files; the gate turns on
  once the backlog is cleared.

## Release exit criteria

A build is releasable when all of the following hold:

1. Quality job green: build, unit tests, word QA, and test-suite typecheck.
2. Newman contract suite green against the seeded emulator.
3. Cypress smoke green with no retried tests.
4. Latest nightly regression green, or every failure triaged to a documented
   defect with an accepted severity.
5. No open Critical or High defect against a shipping feature
   (see [DEFECTS.md](DEFECTS.md)).
6. Load smoke within thresholds on the most recent nightly run.
7. Evidence archived: Newman report, Cypress JUnit results, and any failure
   screenshots or videos are attached to the run.

## Running everything locally

```bash
# Terminal 1 — Firebase emulators (needs Java)
npm run emulators

# Terminal 2 — deterministic model stub + word-gen API
npm run qa:ollama-stub
OLLAMA_BASE_URL=http://127.0.0.1:11434 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run word-gen-server

# Terminal 3 — seed data, then run the suites
npm run qa:seed
npm run api:test
npm run build:e2e && npm run e2e:ci
```
