# How to seed / insert new unique words into Firestore

The app seeds the `words` collection when it starts **only if** the seed is enabled and the stored version is below the target.

## Command to run the seed

**Option 1 — In-app seed (recommended)**

1. Set the env flag and start the app:

   ```bash
   VITE_ENABLE_FIREBASE_SEED=true npm run dev
   ```

2. Open the app in the browser (e.g. `http://localhost:5173`).  
   `seedFirestoreIfNeeded()` runs on load. It will:
   - Run v1 (legacy words from `words.tsx`) if not done
   - Run v2 (sampleWords) if not done
   - Run v3 (newCategoryWords — Music, Famous People, etc.) if not done
   - Run v4 (oldCategoryExpansionWords — 30 per old category, multi-language) if not done

3. After seeding, **turn the flag off** so it doesn’t run on every load:

   - Remove or set `VITE_ENABLE_FIREBASE_SEED=false` in `.env`, or
   - Stop using it in the start command.

**Option 2 — Using `.env`**

1. In project root, create or edit `.env` and add:

   ```
   VITE_ENABLE_FIREBASE_SEED=true
   ```

2. Run:

   ```bash
   npm run dev
   ```

3. Open the app once so the seed runs, then set `VITE_ENABLE_FIREBASE_SEED=false` or remove that line.

## What gets seeded

- **v1:** Legacy words from `src/assets/words.tsx`
- **v2:** `sampleWords` (multicultural: Food, Places, etc.)
- **v3:** `newCategoryWords` (20 per category: Music, Famous People, Entertainment, Colors & Shades, Geography, Names, Science, Literature) — **only words not already in sampleWords**
- **v4:** `oldCategoryExpansionWords` (30 per old category: Food, Animals, Movies & TV, Sports & Games, Places, Jobs & Professions, Objects & Things) — **only words not already in sampleWords or newCategoryWords**

Languages/regions in v4: English (US/UK/Canada), French (France), Spanish (Spain + Argentina), Italian (Italy), Japanese (Japan), Mandarin (China), German (Germany).

## Requirements

- Firebase project configured (`VITE_FIREBASE_*` in env).
- Firestore rules allow write to `words/*` and `meta/seed` (at least while seeding).
