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
