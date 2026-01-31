# AI Word Generation — Security & Operational Considerations

This doc covers security and operational concerns for **on-demand AI word generation** (e.g. Mistral) where users trigger generation for new or existing language/region/category combinations. Words are written to local sample data and seeded to Firestore.

---

## 1. **API key exposure**

- **Risk:** Mistral (or similar) API keys must be used from a backend or a proxy. If called directly from the browser, keys are exposed and can be abused.
- **Mitigation:** Run all AI calls from a **backend service** (e.g. Cloud Functions, Vercel serverless, or a small Node server). The frontend calls your backend; the backend calls Mistral with the key stored in server env vars. Never put Mistral keys in `VITE_*` or any client bundle.

---

## 2. **Rate limiting & abuse**

- **Risk:** Without limits, users (or bots) can exhaust free-tier tokens or cause cost spikes.
- **Mitigation:**
  - **Per-user limits:** Cap how many “generate” requests a user can make per day/week (e.g. by Firebase Auth UID). Store usage in Firestore or a small backend DB.
  - **Global limits:** Apply a global cap (e.g. max N requests per minute) on the backend to handle traffic spikes and abuse.
  - **Token budget:** Track approximate tokens per request (e.g. ~30 words × categories × prompt size) and stop once a daily token budget is reached.

---

## 3. **Firestore writes from user-triggered AI**

- **Risk:** Any client or backend logic that writes AI-generated content into Firestore can be abused (spam, inappropriate words, or overwriting good data).
- **Mitigation:**
  - **Backend-only writes:** Only the backend that calls the AI should write to Firestore (or write a “pending” queue that a trusted job processes). Do not let the client write raw AI output.
  - **Moderation (optional):** For higher risk, run generated words through a moderation step (e.g. blocklist, or a small moderation API) before persisting.
  - **Idempotent seeding:** Use a stable ID (e.g. `makeWordId(category, word)`) so re-runs don’t create duplicates and you can re-seed safely.

---

## 4. **Input validation & prompt injection**

- **Risk:** User-supplied language/region/category could be used in prompts. Malicious input could try to change model behavior or leak system prompts.
- **Mitigation:**
  - **Allowlist:** Validate language and region against a fixed allowlist (e.g. from `existingLanguageRegion` + a curated “allowed new” list). Reject anything else.
  - **Strict categories:** Only allow categories from `ALL_CATEGORIES`; do not pass free text as “category” into the prompt.
  - **Sanitize:** Normalize and length-limit all inputs before building the prompt.

---

## 5. **Cost and quota (free Mistral plan)**

- **Risk:** Free tier has limited tokens/month; a few heavy users or a bug can exhaust the quota.
- **Mitigation:**
  - **Per-call cap:** e.g. “30 words per category” and a max number of categories per request.
  - **Per-user and global caps** (see §2).
  - **Monitoring:** Log request count and approximate token usage; set simple alerts when approaching a budget.

---

## 6. **Data consistency (local sample + Firestore)**

- **Risk:** “Insert into local sample and seed to Firestore” can get out of sync (e.g. seed fails after local update, or two clients seed the same words).
- **Mitigation:**
  - Treat **Firestore as source of truth**. Local sample is for development or one-off scripts; production gameplay should read from Firestore.
  - Run seeding in one place (e.g. backend after AI generation). Use idempotent writes so re-seeding is safe.
  - If you do update a local JSON for dev, document that it’s not the production source and consider regenerating it from Firestore or a script.

---

## 7. **Authentication and authorization**

- **Risk:** Unauthenticated or unauthorized users could trigger expensive or abusive generation.
- **Mitigation:**
  - Require **Firebase Auth** (or your auth) for “Generate words (AI)”. Pass the user’s ID token to your backend; verify it before calling Mistral and writing to Firestore.
  - Optionally restrict “Add new language & region” or “Generate more words” to certain roles or invite-only in the future.

---

## Summary

| Concern              | Mitigation                                              |
|----------------------|---------------------------------------------------------|
| API key exposure     | AI calls only from backend; keys in server env only     |
| Rate limiting/abuse  | Per-user and global caps; token budget                 |
| Firestore abuse      | Backend-only writes; optional moderation; idempotent   |
| Prompt injection     | Allowlist language/region/category; sanitize inputs     |
| Cost/quota           | Cap tokens per request and per user; monitor usage      |
| Data consistency     | Firestore as source of truth; idempotent seeding       |
| Auth                 | Require auth; verify token on backend                  |

Implementing the generation flow **on the backend** with the above mitigations will address the main security and operational risks while keeping the “on-demand, user-driven” product behavior.
