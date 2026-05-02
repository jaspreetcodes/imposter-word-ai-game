# Word Generation Prompt Design (Ollama + mistral-small3.2)

This doc describes the prompt used to generate category/language/region-specific words with minimal errors and consistent output.

---

## Goal

Generate **30 words per category** for **all listed categories** (Food, Animals, Movies & TV, Sports & Games, Places, Jobs & Professions, etc.) for a **single language and region**.

- **Categories** – All game categories (Food, Animals, Movies & TV, Places, …); 30 words each.
- **Language** (e.g. English, Punjabi)
- **Region** (e.g. UK, Punjab, Toronto)

Output must be **valid JSON** so the app can parse and store it (e.g. in Firestore) without manual cleanup.

---

## Prompt Design Principles

1. **Structured output only** – System prompt instructs: "Output valid JSON only. No other text, no markdown, no explanation." Reduces stray prose and markdown wrappers.
2. **Exact format** – User prompt specifies keys: `"word"`, `"category"`, `"language"`, `"region"` and gives a one-line example. Mistral-small3.2 follows instructions well, so this reduces malformed objects.
3. **Single-word constraint** – Explicit: "Each item must be a single word (no phrases, no compound words with spaces)." Reduces multi-word entries.
4. **Safety and appropriateness** – "Words must be appropriate for all ages and cultures" and "Do not include offensive or inappropriate words."
5. **No duplicates** – "Do not repeat the same word."
6. **Copy exact values** – "Use the exact category, language, and region values provided" so every item has consistent metadata for filtering.

---

## System Prompt (summary)

- Role: word list generator for a party word game.
- Output: exactly one JSON array, no other text.
- Rules: single word per item, family-friendly, real and commonly understood in the given language/region, no duplicates, keys `word` / `category` / `language` / `region`.

---

## User Prompt (summary)

- "Generate exactly 30 single-word items for the category X only."
- "Category: X (all 30 words must belong to this category only). Language: Y. Region: Z."
- "Output a JSON array of objects. Each object must have: word, category, language, region."
- "Use category=X, language=Y, region=Z for every item. Words must be typical for X and commonly understood in Y (Z)."
- One-line example array in the requested format.

The generator runs this prompt **once per category** (Food, then Animals, then Movies & TV, …) and combines results into one list.

---

## Parsing and Error Handling

- **Extract JSON** – Strip markdown code blocks (e.g. ` ```json ... ``` `) if present; otherwise find first `[` and last `]` and slice. Parse with `JSON.parse`.
- **Validate items** – Keep only objects with a non-empty `word`; coerce `category`, `language`, `region` to strings.
- **Map to app shape** – Convert to `{ word, category, languages: [language], regions: [region] }` for Firestore/WordDocument.

---

## Usage

1. **Ollama** must be installed and the model pulled (first time only) and running:
   ```bash
   ollama pull mistral-small3.2   # one-time download
   ollama run mistral-small3.2    # or leave running in background
   ```
   If the model is not found, run `ollama pull mistral-small3.2` and ensure Ollama is running (e.g. `ollama serve` or the Ollama app).
2. **Generate words** (CLI) – 30 words per category for all categories, for the given language and region:
   ```bash
   npm run word-generate:ollama
   # defaults: English, UK, 30 per category

   npm run word-generate:ollama -- Punjabi Punjab
   # 30 per category for Punjabi (Punjab)

   npm run word-generate:ollama -- English UK 20
   # 20 per category for English (UK)
   ```
3. **From code** – Import `generateWordsForAllCategories` and call with `{ language, region, countPerCategory }`; or `generateWords` for a single category with `{ category, language, region, count }`.

---

## Mistral cloud vs Ollama

This project uses **Ollama** (local mistral-small3.2) via `@langchain/ollama`, not the Mistral AI cloud API. If you switch to **Mistral cloud** ([LangChain Mistral docs](https://docs.langchain.com/oss/javascript/integrations/llms/mistral)), you can use `@langchain/mistralai` and its hooks: `beforeRequestHook`, `requestErrorHook`, `responseHook` for logging, retries, or inspection. Ollama does not expose those hooks in the same way.

---

## References

- [Ollama mistral-small3.2](https://ollama.com/library/mistral-small3.2)
- [LangChain JS Ollama](https://js.langchain.com/docs/integrations/chat/ollama)
- [LangChain Mistral (cloud)](https://docs.langchain.com/oss/javascript/integrations/llms/mistral) – for cloud API and hooks
- App word shape: `src/services/wordsService.ts` (`WordDocument`)
