# On-Demand Multilingual Word Generation — Technical Direction

**Audience:** Technical team, product stakeholders.  
**Scope:** On-demand word generation for a game; goal = cover all world languages; AI runs only when words are missing; low-cost, scalable, indie-scale.

---

## Executive Summary

- **No fine-tuning.** We use off-the-shelf instruct models with structured prompts only. Fine-tuning would require labeled data, training infra, and ongoing maintenance; prompt engineering + small models are sufficient for “N words per category per language” and keep cost and complexity minimal.
- **AI runs only on cache miss.** Primary path is read-from-Firestore (existing multilingual word DB). A backend triggers LLM only when a (language, category) or (language, region, category) combination has no words or below a minimum count.
- **Primary model: Phi-3.5 Mini Instruct** (or equivalent small instruct). Fallback: Qwen 2.5B Instruct. Both are small, fast, support many languages, and can be run locally (Ollama) or via cloud API; choice depends on deployment (local vs serverless).
- **Determinism and cost control:** Stable prompts, temperature ≤ 0.5, and a **cache-first** design. All generated words are written to Firestore with stable IDs; repeated requests for the same (language, category) hit cache. Rate limits and token budgets cap cost.
- **Runtime flow:** Client requests game config (language, categories) → backend checks Firestore for word count per (language, category) → if any bucket is empty/short, backend calls LLM once per missing bucket, writes results to Firestore, then returns (or client refetches). No inference during active gameplay.
- **Deliverables:** Backend “word coverage” check, on-demand generation endpoint, caching and idempotent writes, rate/token limits, and monitoring for cost and latency.

---

## Model Strategy

### Fine-tuning: Not Used

- **Decision:** No fine-tuning.
- **Reason:** Task is constrained (generate lists of single words per category/language with a fixed JSON schema). Off-the-shelf instruct models follow structured prompts well enough. Fine-tuning would require curated (language, category, word) datasets, training pipeline, and versioning; ROI is low for an indie-scale, multi-language word generator.

### Model Selection

| Role      | Model                  | Justification |
|-----------|------------------------|---------------|
| **Primary** | Phi-3.5 Mini Instruct | Small (3.8B), fast inference, strong instruction following and multilingual coverage. Fits local (Ollama) or serverless (Replicate / HF Inference). Low cost per request. |
| **Fallback** | Qwen 2.5B Instruct   | Smaller (2.5B), good for strict JSON output and non-English. Use when primary is unavailable or for lower-cost tier. |

- **Deployment options:** (1) Local: Ollama with `phi3.5` / `qwen2.5:3b` (or similar). (2) Cloud: Serverless function calling Replicate, Hugging Face Inference, or a small VPS running Ollama. Primary/fallback can be implemented as “try primary → on failure or timeout, call fallback.”
- **Output:** Structured JSON only (array of `{ word, category, language [, region] }`). System prompt enforces “output valid JSON only”; temperature 0.3–0.5 to balance variety and determinism.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Client (Game UI)                                                            │
│  - Selects language (+ optional region), categories                          │
│  - Requests "start game" or "ensure words for (lang, categories)"            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend (API / Cloud Function)                                              │
│  - Auth, rate limit, input validation (allowlist language/category)          │
│  - Word coverage check (Firestore)                                           │
│  - On-demand generator (only on cache miss)                                  │
│  - Writes to Firestore (idempotent, stable IDs)                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                    │
         │ read                                │ write (after generate)
         ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────┐
│  Firestore           │            │  LLM (Phi-3.5 /     │
│  - words collection   │            │  Qwen 2.5B)         │
│  - indexed by         │            │  - One call per     │
│    category,          │            │    (lang, category) │
│    languages[],       │            │    bucket missing   │
│    regions[]          │            │  - No always-on     │
└──────────────────────┘            └──────────────────────┘
```

- **No always-on inference.** LLM is invoked only when the coverage check finds a (language, category) — or (language, region, category) if region is in scope — with word count below threshold (e.g. 0 or &lt; N).
- **Single source of truth:** Firestore. All gameplay reads from Firestore; generator only writes new words. Stable doc IDs (e.g. `makeWordId(category, word)`) keep writes idempotent and avoid duplicates.

---

## Runtime Flow

### 1. Game start / “Ensure words” request

- Client sends: `{ language, region? (optional), categories[] }`.
- Backend validates language and categories against allowlists.

### 2. Word coverage check (Firestore)

- For each (language, category) — or (language, region, category) if region used — query Firestore for word count (e.g. `where("languages", "array-contains", language)`, `where("category", "==", category)`; if region, filter by `regions` in app or in query).
- If **all** buckets have count ≥ minimum (e.g. 20–30): **no LLM call.** Return success; client fetches words for gameplay as today.

### 3. On-demand generation (cache miss only)

- For each bucket with count &lt; minimum:
  - Call **primary model** (Phi-3.5 Mini) with fixed system prompt + user prompt: “Generate exactly K single words for category X, language Y [, region Z]. Output JSON array only.”
  - On failure or timeout: call **fallback model** (Qwen 2.5B) with same prompt.
  - Parse JSON; validate (single words, allowed category/language); dedupe against existing words in that bucket.
  - Write new words to Firestore (batch, stable IDs). Increment in-memory or re-query count.
- Return success (or partial success + list of failed buckets). Client can retry or refetch.

### 4. Gameplay

- **No inference.** Client (or backend) fetches words from Firestore by (language, categories) and samples randomly. Latency = Firestore read only.

### 5. Determinism and caching

- **Determinism:** Same (language, category, region) + same model and temperature → similar (not necessarily identical) word set; stable IDs prevent duplicate docs on re-run.
- **Caching:** Firestore is the cache. Once a bucket is filled, future requests for that bucket do not call the LLM. Optional: in-memory or Redis “recently generated (lang, category)” TTL to avoid redundant Firestore checks for a short window (e.g. 60 s).

---

## Caching and Cost-Control Strategy

| Mechanism | Description |
|-----------|-------------|
| **Cache-first** | Always check Firestore word count before calling LLM. Generate only for buckets below threshold. |
| **Idempotent writes** | Stable doc ID = `f(category, word)` (e.g. slug). Re-generation of same word does not create duplicate; merge/set with overwrite. |
| **Rate limits** | Per user (e.g. Firebase UID): max N “generate” requests per day. Per IP or global: max M requests per minute. Return 429 when exceeded. |
| **Token budget** | Approximate tokens per request (prompt + 30 words × chars). Cap daily token spend per user or globally; stop generation when budget reached. |
| **Model fallback** | Primary (Phi-3.5) first; fallback (Qwen 2.5B) only on failure. Prefer smaller/cheaper when both available to reduce cost. |
| **Batching** | One LLM call per (language, category) bucket requesting K words (e.g. 30), not one call per word. Reduces round-trips and overhead. |

---

## Plan of Action & Deliverables

### Phase 1: Coverage check and API contract

| # | Deliverable | Owner | Notes |
|---|-------------|--------|--------|
| 1.1 | **Word coverage API** — Input: `language`, `region?`, `categories[]`. Output: `{ ok: boolean, missing?: { language, category, region? }[] }` using Firestore count queries. | Backend | Reuse existing `words` collection and indexes. |
| 1.2 | **Allowlist** — Validate `language` and `categories` against app constants; optional `region` allowlist. Reject invalid input with 400. | Backend | Align with `ALL_CATEGORIES` and existing language/region lists. |

### Phase 2: On-demand generation

| # | Deliverable | Owner | Notes |
|---|-------------|--------|--------|
| 2.1 | **Structured prompt** — System + user prompt for “N words, category X, language Y [, region Z], JSON only.” Single canonical prompt used for both Phi-3.5 and Qwen 2.5B. | Backend | Extend current prompt in `ollamaWordGenerator` / WORD_GENERATION_PROMPT. |
| 2.2 | **Generator service** — One function: `generateWordsForBucket(language, category, region?, count)` calling primary model; on failure, fallback model. Returns `WordDocumentLike[]`. | Backend | Can wrap existing Ollama generator or call Replicate/HF. |
| 2.3 | **Orchestrator** — Given coverage result, for each missing bucket call generator, parse and validate JSON, batch-write to Firestore with stable IDs. Return list of filled buckets and any errors. | Backend | Idempotent writes; no duplicate words for same (category, word). |
| 2.4 | **API endpoint** — e.g. `POST /api/words/ensure` body `{ language, region?, categories[] }`. Calls coverage → generator only for missing → returns. Auth + rate limit. | Backend | Used by game UI before starting a round. |

### Phase 3: Cost and reliability

| # | Deliverable | Owner | Notes |
|---|-------------|--------|--------|
| 3.1 | **Rate limiting** — Per-user (and optionally per-IP) limits on `POST /api/words/ensure` or equivalent. Store usage in Firestore or Redis; return 429 when exceeded. | Backend | See AI_SECURITY_CONSIDERATIONS. |
| 3.2 | **Token budget (optional)** — Estimate tokens per request; increment user or global counter; reject new generation when budget exceeded until reset (e.g. daily). | Backend | Indie-scale: start with rate limit only; add token budget if using paid API. |
| 3.3 | **Monitoring** — Log generation requests, model used, latency, and Firestore write count. Alert on high error rate or cost. | Backend | Simple logging + optional dashboard. |

### Phase 4: Client integration

| # | Deliverable | Owner | Notes |
|---|-------------|--------|--------|
| 4.1 | **Call “ensure” before game** — When user selects language (and region) and categories and clicks “Start game,” client calls coverage/ensure endpoint first. If ok, proceed to fetch words and start game; if partial fail, show message or retry. | Frontend | Keeps gameplay path read-only and fast. |
| 4.2 | **Fallback UX** — If ensure fails (e.g. rate limit, model down), show “Words for this language are being prepared; try again in a few minutes” or fall back to a default language/category that has words. | Frontend | No blocking gameplay for known-good buckets. |

---

## References

- **Existing docs:** `docs/AI_SECURITY_CONSIDERATIONS.md`, `docs/WORD_GENERATION_PROMPT.md`, `scripts/wordPipeline/README.md`
- **Data model:** `src/services/wordsService.ts` (WordDocument, Firestore `words` collection)
- **Current generator (reference):** `scripts/wordPipeline/ollamaWordGenerator.ts` (prompt shape, parsing, Firestore-shaped output)
