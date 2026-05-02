# Word pipeline: AI-driven population (offline / on-demand)

This pipeline uses **static word datasets** as the foundation and **Mistral 7B Instruct** (via Hugging Face) for:

- **Categorization** – Assign words to game categories (Food, Animals, Movies & TV, etc.).
- **Filtering** – Keep only words that are widely recognized (suitable for an imposter-style party game).
- **Difficulty** – Assign easy / medium / hard by recognizability.
- **Non-English expansion** – Use external language lists + Mistral to classify and evaluate words for other languages.

## Principles

- **Run AI offline or on-demand**, never during a game.
- **Cache everything** (JSON files in `scripts/wordPipeline/cache/`).
- **No random-word-only APIs** – foundation is always static lists; AI only classifies/filters.

## Foundation datasets

| Source | Role |
|--------|------|
| `public/words_list2.txt` or `public/word_list.json` | Smaller / common-English list |
| `public/words_list.txt` | Larger list |

Words are normalized (trimmed, deduped, length-filtered) before being sent to the model.

## Environment

- **`HF_TOKEN`** – Hugging Face API token (for `router.huggingface.co` chat completions). Create at [hf.co/settings/tokens](https://huggingface.co/settings/tokens).

## Usage (high level)

From project root:

```bash
# 1. Load and normalize static lists → cache/raw_words.json
npm run word-pipeline:load
# or: npx tsx scripts/wordPipeline/loadStaticLists.ts

# 2. Categorize with Mistral (batched) → cache/words_categorized.json
npm run word-pipeline:categorize
# Optional: SAMPLE_SIZE=200 to process only first 200 words (for testing)

# 3. Filter by recognizability + assign difficulty → cache/words_processed.json
npm run word-pipeline:filter
# Optional: INCLUDE_UNRECOGNIZED=true to keep all words; SAMPLE_SIZE for testing

# 4. Export to seed JSON (and optionally Firestore if VITE_FIREBASE_* set)
npm run word-pipeline:export
```

**On-demand word generation (Ollama + LangChain):**

To generate **20 words per category** (default) for **all listed categories** (Food, Animals, Movies & TV, etc.) for a given language and region. **Default model: Phi-3.5 Mini (phi3.5)** for faster runs; override with `OLLAMA_MODEL` (e.g. mistral-small3.2).

1. Install and run Ollama, then pull the model: `ollama pull phi3.5` and `ollama run phi3.5` (or set `OLLAMA_MODEL=mistral-small3.2` and use that model).
2. From project root:
   ```bash
   npm run word-generate:ollama
   # defaults: English, UK, 20 per category, model phi3.5

   npm run word-generate:ollama -- Punjabi Punjab
   # 20 per category for Punjabi (Punjab)

   npm run word-generate:ollama -- English UK 30
   # 30 per category for English (UK)
   ```
   For server: see **docs/PHI_WORD_GENERATION.md** (run word-gen server on host, Phi-3.5 default, user-triggered generation).
3. Output is one JSON array (word, category, languages, regions) suitable for Firestore. See `scripts/wordPipeline/ollamaWordGenerator.ts` and `docs/WORD_GENERATION_PROMPT.md`.

**UI "Generate words" button (CategoriesSelector):**

To use the **Generate words** button in the app (Categories → Generate culture-rich words (AI) → language + region → Generate words):

1. Run the word-gen API server: `npm run word-gen-server` (listens on http://localhost:3001).
2. Ensure Ollama is running with mistral-small3.2: `ollama run mistral-small3.2`.
3. In the app, enter language and region, then click **Generate words**. The app calls the API, adds words to Firestore, adds the new language/region to the categories list, shows "New words added successfully", and redirects to the setup/categories page.

Run full pipeline in sequence:

```bash
npm run word-pipeline
```

**Testing without burning API calls:** use `SAMPLE_SIZE=200` when running `word-pipeline:categorize` and `word-pipeline:filter` (e.g. `SAMPLE_SIZE=200 npm run word-pipeline:categorize`).

Optional:

- **Non-English**: Use external language lists (see RESEARCH.md) and run the same pipeline with a language-specific raw list; then merge into seed with `languages` and `regions` set.

## Categories (canonical)

- Food  
- Animals  
- Movies & TV  
- Sports & Games  
- Places  
- Jobs & Professions  
- Objects & Things  
- Names  
- Chemicals  
- Music  
- Science  
- Basic Words  
- Colors & Shades  
- Entertainment  
- Famous People  
- Geography  
- Literature  
- Artists  
- Technology  

## Cache files

| File | Description |
|------|-------------|
| `cache/raw_words.json` | Normalized word list (strings) from static files |
| `cache/words_categorized.json` | `{ word, category }[]` from Mistral |
| `cache/words_processed.json` | `{ word, category, difficulty }[]` after recognizability + difficulty |
| `cache/words_processed.{batch}.json` | Partial batch cache for resume |

## Research: other languages and APIs

See **RESEARCH.md** in this folder for:

- Suggested APIs and word lists for major languages (e.g. Open Multilingual Wordnet, Wiktionary, DWDS).
- How to use them as “training data” for Mistral: feed word lists + ask the model to categorize and rate recognizability; cache results and never run per game.
