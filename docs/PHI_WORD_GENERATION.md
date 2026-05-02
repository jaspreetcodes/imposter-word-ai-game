# Phi-3.5 Mini for Word Generation — Setup & Usage

This doc describes how to run **word generation on the server** using **Phi-3.5 Mini Instruct** (default), and how user actions in the project trigger generation.

---

## Why Phi-3.5 Mini

- **Small (~3.8B params):** Faster than 7B/24B models; 20 words per category × 19 categories completes in roughly **2–8 minutes** on CPU, **~1–3 minutes** on GPU (varies by hardware).
- **Low resource:** Runs on modest hardware; suitable for a single server or local Ollama.
- **Instruct-tuned:** Follows JSON-only prompts well for “N words, category X, language Y, region Z.”
- **Default in this project:** The word-gen server uses `phi3.5` by default. Override with `OLLAMA_MODEL` (e.g. `mistral-small3.2`) if you prefer.

---

## Expected Runtime (20 words per category)

| Setup | Approx. total time (19 categories × 20 words) |
|-------|-----------------------------------------------|
| Phi-3.5 Mini, GPU (e.g. T4, M1/M2) | ~1–3 min |
| Phi-3.5 Mini, CPU only | ~2–8 min |
| Mistral Small 24B, GPU | ~5–15 min |

So **20 words per category with Phi-3.5 is typically under a few minutes** on a server with GPU; acceptable for “Generate words” triggered by user action (user sees “Generating…” then success).

---

## Running on a Server

### 1. Install Ollama on the server

- **Linux:** `curl -fsSL https://ollama.com/install.sh | sh`
- **macOS:** Download from [ollama.com](https://ollama.com) or `brew install ollama`

### 2. Pull Phi-3.5 Mini

```bash
ollama pull phi3.5
```

(Or `phi3.5:mini` if your Ollama version uses that tag. List with `ollama list`.)

### 3. Run Ollama (so it keeps running)

- **Foreground (for testing):** `ollama run phi3.5` — model stays loaded; Ctrl+C stops it.
- **Background / service:** Run Ollama as a systemd service (Linux) or keep it in the background so it listens on `http://localhost:11434`. The word-gen server will call this URL.

### 4. Set environment (optional)

```bash
# Default model (already phi3.5)
export OLLAMA_MODEL=phi3.5

# Words per category (default 20)
export WORDGEN_COUNT_PER_CATEGORY=20

# If the word-gen server runs on another host than Ollama
export OLLAMA_BASE_URL=http://localhost:11434
```

### 5. Run the word-gen server

From the project root:

```bash
npm run word-gen-server
```

Server listens on **http://localhost:3001** (or `PORT`). It uses **Phi-3.5** by default and generates **20 words per category** unless overridden.

### 6. Point the app at the server

- **Local:** Frontend default `VITE_WORDGEN_API_URL=http://localhost:3001` is correct.
- **Remote server:** Build the app with `VITE_WORDGEN_API_URL=https://your-server.com` (or the URL where the word-gen server is exposed). Ensure CORS allows your app origin.

---

## How User Actions Trigger Generation

1. **User:** Opens **Categories** in the app → expands **“Generate culture-rich words (AI)”** → enters **Language** and **Region** → clicks **“Generate words.”**
2. **Frontend:** Calls `POST /api/generate-words` with `{ language, region }` (and optionally `countPerCategory`; default 20).
3. **Word-gen server:** Receives the request → calls `generateWordsForAllCategories({ language, region, countPerCategory: 20 })` → for each of the 19 categories, calls **Ollama (Phi-3.5)** with the structured prompt → parses JSON → aggregates words.
4. **Server:** Returns `{ words }` to the frontend.
5. **Frontend:** Writes words to **Firestore** via `addWordsToFirestore(words)`, adds the new language/region to the categories list, shows **“New words added successfully”**, then redirects to the setup/categories page.

So **generation runs on the server** only when the user performs that action (language + region + “Generate words”). No inference runs during normal gameplay; gameplay reads only from Firestore.

---

## Overriding Model or Count

- **Use a different Ollama model (e.g. Mistral):**  
  `OLLAMA_MODEL=mistral-small3.2 npm run word-gen-server`  
  (Requires `ollama pull mistral-small3.2`.)

- **Change words per category:**  
  `WORDGEN_COUNT_PER_CATEGORY=30 npm run word-gen-server`  
  Or send `countPerCategory: 30` in the POST body from the frontend (if the client is updated to pass it).

---

## Checklist for “Generate words” Using Phi on a Server

1. [ ] Ollama installed on the server.
2. [ ] `ollama pull phi3.5` (or your chosen model).
3. [ ] Ollama running (foreground or as a service) so it serves `http://localhost:11434` (or `OLLAMA_BASE_URL`).
4. [ ] From project root: `npm run word-gen-server` (with optional `OLLAMA_MODEL`, `WORDGEN_COUNT_PER_CATEGORY`, `PORT`).
5. [ ] App built with correct `VITE_WORDGEN_API_URL` pointing at the word-gen server.
6. [ ] User: Categories → Generate culture-rich words (AI) → Language + Region → **Generate words**.

---

## References

- [Ollama Phi-3.5](https://ollama.com/library/phi3.5) (or `phi3.5:mini` depending on Ollama version)
- Project: `scripts/wordPipeline/ollamaWordGenerator.ts`, `scripts/wordGenServer.ts`, `docs/WORD_GENERATION_PROMPT.md`
