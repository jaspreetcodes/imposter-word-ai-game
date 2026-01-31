# Research: APIs and lists for other languages

Use these as **training data** for Mistral: ingest word lists, then run the same pipeline (categorize + recognizability) offline; cache results forever.

## English (foundation)

- **Current**: `public/words_list.txt`, `public/words_list2.txt`, `public/word_list.json` (static lists).
- No API required for base population; AI is used only to categorize and filter.

## Other major languages – suggested sources

### General / multilingual

- **Open Multilingual Wordnet**  
  - [http://compling.hss.ntu.edu.sg/omw/](http://compling.hss.ntu.edu.sg/omw/)  
  - Synsets and lemmas for many languages; can extract noun/entity lists and use Mistral to map to your categories and rate recognizability.

- **Wiktionary / Wiktionary API**  
  - [https://en.wiktionary.org/wiki/Wiktionary:Main_Page](https://en.wiktionary.org/wiki/Wiktionary:Main_Page)  
  - Dump or API: word lists per language; filter by part of speech, then run through Mistral for category + popularity.

- **Unified Language Model (ULM) word lists**  
  - Various open word-frequency lists per language (e.g. from research corpora). Use as “raw” lists; Mistral assigns category and recognizability.

### By language (examples)

- **French**: Lexique (lexique.org), French Wiktionary dumps.  
- **German**: DWDS (dwds.de) core vocabulary; DeReKo word lists.  
- **Spanish**: RAE (rae.es) or frequency lists (e.g. from CREA).  
- **Hindi / Punjabi / Urdu**: IIT Bombay word lists, Hindi WordNet; Urdu WordNet.  
- **Mandarin**: Word lists from HSK or open Chinese corpora.

## Strategy for non-English expansion

1. **Obtain** a word list for the target language (API, dump, or static file).
2. **Normalize** (trim, dedupe, length filter) like in `loadStaticLists.ts`.
3. **Run Mistral** (offline / on-demand):
   - Categorize each word (or batch) into your game categories.
   - Evaluate “recognizability” for the target culture/region; drop obscure terms.
   - Optionally assign difficulty (easy/medium/hard) by popularity.
4. **Cache** results (e.g. `cache/words_processed_<lang>.json`) with a `languages` and `regions` field.
5. **Merge** into Firestore or seed data with the same `WordDocument` shape (word, category, difficulty, languages, regions).

Mistral is used only as a classifier/evaluator on top of static or API-derived lists; no “random word” API is used during games.
