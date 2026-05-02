# Run This Project Once

Commands and env setup to run the app and optional services (Firebase, word-gen).

---

## Prerequisites

- **Node.js** 18+ and **npm**
- (Optional) **Firebase** project for word DB and auth
- (Optional) **Ollama** + **word-gen server** for "Generate words" in categories

---

## 1. Commands to run once

From the project root:

```bash
# Install dependencies
npm install

# Copy env template (create .env from .env.example)
cp .env.example .env

# Start the app (dev server, usually http://localhost:5173)
npm run dev
```

That’s enough to **run the app once**. If you don’t set any env vars, the app still starts; word loading may fall back to local data or fail if Firebase isn’t configured (see below).

---

## 2. .env file — what to change

Create a `.env` in the project root (e.g. copy from `.env.example`). **No need to uncomment** — add or edit only the lines you want.

### Minimal (app only, no Firebase)

- Leave `.env` empty or with only comments.
- **Result:** App runs. Word loading will **fail** (no Firebase), and the game may fall back to local/seed words if that path exists, or show an error. For a full game you need Firebase (next section).

### Full (app + word DB + optional features)

Add these **only if** you use the feature:

| Variable | Required for | What to do |
|----------|----------------|------------|
| **Firebase (word DB + auth)** | Playing with words from Firestore, rooms, sign-in | Create a Firebase project, then in `.env` set: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and optionally `VITE_FIREBASE_APP_ID`. See **FIREBASE_SETUP.md**. |
| **Geoapify** | Region autocomplete in Categories | Add `VITE_GEOAPIFY_API_KEY=your_key`. Get a key at [Geoapify](https://www.geoapify.com/get-started-with-maps-api). |
| **Word-gen API URL** | "Generate words" button in Categories | Only if you run the word-gen server elsewhere. Add `VITE_WORDGEN_API_URL=http://localhost:3001` (or your server URL). Default is `http://localhost:3001` so often you don’t need this. |

**No uncommenting** — `.env.example` has commented lines; in your real `.env` you **add** the variables you need (with values), e.g.:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_GEOAPIFY_API_KEY=your_geoapify_key
```

---

## 3. Optional: "Generate words" (Phi-3.5 / Ollama)

To use the **Generate words** button (Categories → Generate culture-rich words (AI) → language + region → Generate words):

1. **Install and run Ollama**, then pull the model:
   ```bash
   ollama pull phi3.5
   ollama run phi3.5
   ```
   (Leave that terminal open or run Ollama as a service.)

2. **Start the word-gen server** (separate terminal):
   ```bash
   npm run word-gen-server
   ```
   Server listens on http://localhost:3001. App already uses that URL by default; no `.env` change needed unless your server runs elsewhere.

3. In the app: open **Categories** → **Generate culture-rich words (AI)** → enter **Language** and **Region** → click **Generate words**.

See **docs/PHI_WORD_GENERATION.md** for server setup and env (`OLLAMA_MODEL`, `WORDGEN_COUNT_PER_CATEGORY`).

---

## 4. Summary

| Goal | Commands | .env |
|------|----------|------|
| **Run app once** | `npm install` → `cp .env.example .env` → `npm run dev` | Optional: add Firebase vars for word DB (see FIREBASE_SETUP.md). |
| **Region autocomplete** | (same) | Add `VITE_GEOAPIFY_API_KEY=...` |
| **Generate words** | (same) + in another terminal: `ollama run phi3.5` and `npm run word-gen-server` | Default API URL is localhost:3001; no change needed unless server is elsewhere. |

**No code changes** (e.g. uncommenting) are required — only creating `.env` and setting the variables you need.
