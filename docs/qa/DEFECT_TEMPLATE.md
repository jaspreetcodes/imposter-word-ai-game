# Defect report template

Copy this into a new entry in [DEFECTS.md](DEFECTS.md) or into the issue
tracker. A report is only useful if someone else can reproduce the problem
without asking a follow-up question.

---

## DEF-000 — <one-line summary in plain language>

| Field | Value |
| --- | --- |
| Status | Open / In progress / Fixed / Closed / Won't fix |
| Severity | Critical / High / Medium / Low |
| Priority | P1 / P2 / P3 |
| Reported | YYYY-MM-DD by <name> |
| Build | commit SHA or release tag |
| Environment | Local test / CI / Staging / Production |
| Component | Gameplay / Catalog / Word-gen API / Auth / UI |
| Found by | Automated (<spec or request name>) / Manual / User report |
| Owner | <name> |

### Preconditions

What must be true before the steps make sense: seeded data, signed-in state,
viewport, feature flags, environment.

### Steps to reproduce

1. …
2. …
3. …

Number every step and include the exact values used (locale, category, player
count). "Play a game and see the bug" is not a reproduction.

### Expected result

What the product should do, and why — the rule, requirement, or user
expectation being violated.

### Actual result

What actually happened, quoted exactly: the error text, the status code, the
assertion message.

### Evidence

- Screenshot: `cypress/screenshots/<spec>/<test> (failed).png`
- Video: `cypress/videos/<spec>.mp4`
- Report: `reports/newman/newman-report.html` or `reports/cypress/*.xml`
- Logs: relevant console or server output, trimmed to the useful lines
- CI run: link to the workflow run that produced the artifacts

### Affected test

The spec or request that reproduces it, e.g.
`cypress/e2e/known-defects/repeated-word.cy.ts`. If none exists, say so and note
whether one should be added.

### Impact

Who is affected, how often, and whether a workaround exists.

### Fix reference

Pull request or commit that resolves it.

### Retest result

| Field | Value |
| --- | --- |
| Retested on | build / date |
| Result | Pass / Fail |
| Regression test | Where the permanent guard now lives |

---

## Severity guide

| Severity | Meaning | Examples |
| --- | --- | --- |
| Critical | Core journey unusable, data loss, or a security issue; no workaround | Cannot start a round; every player sees the Mafia message; secret word visible to all |
| High | Major feature broken or badly degraded; workaround is painful | Category filter returns words from other categories; sign-in fails for all users; API 500s on valid input |
| Medium | Feature works but behaves incorrectly in a noticeable way; workaround exists | Repeated secret word across rounds; word counts wrong in the picker; error message unclear |
| Low | Cosmetic or minor inconvenience | Spacing off at one breakpoint; inconsistent capitalisation |

Priority is scheduling, severity is impact. A Low-severity defect on the landing
page can still be P1 before a launch.

## Evidence requirements

Every defect found by automation must carry the artifacts its run produced —
screenshot, video, and the JUnit or Newman report entry. Do not re-document
passing runs by hand; the archived report is the record. Manual findings need a
screenshot or recording plus the exact build identifier, otherwise the report
cannot be retested reliably.
