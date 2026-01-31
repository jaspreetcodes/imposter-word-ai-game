# Firebase Setup Guide

This guide will help you set up Firebase for the word database.

## Why This Structure?

We use a **flat document structure** where each word is a separate document with metadata:

```typescript
{
  word: "Roti",
  category: "Food",
  difficulty: "easy",
  languages: ["Punjabi", "Hindi", "Urdu"],
  regions: ["Punjab", "India"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Benefits:
- ✅ **Efficient querying**: Filter by category, language, region, or any combination
- ✅ **Scalable**: Easy to add new metadata fields (e.g., difficulty, tags)
- ✅ **Flexible**: Support multiple languages/regions per word
- ✅ **Fast**: Firestore indexes make queries very fast
- ✅ **Future-proof**: Easy to add features like user-generated words, ratings, etc.

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "imposter-word-game")
4. Follow the setup wizard
5. Enable Firestore Database when prompted

### 2. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app (name it "Web")
5. Copy the Firebase configuration object

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Set Up Firestore Security Rules

In Firebase Console, go to **Firestore Database** > **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to words collection
    match /words/{document} {
      allow read: if true; // Public read access
      allow write: if false; // No public write (use admin SDK for writes)
    }
    // Marker doc for one-time seeding
    match /meta/seed {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Note**: For production, you may want to restrict read access or add authentication.

### 5. Migrate Existing Words

Run the migration script to populate Firebase with words from `words.tsx`:

```bash
# Make sure your .env file has Firebase config
npx tsx scripts/migrateWordsToFirebase.ts
```

### Alternative: One-time seed from the web app (no terminal command)

If you prefer seeding from the app itself (runs once, then never again), we support a guarded client-side seed:

1. Add to `.env`:

```env
VITE_ENABLE_FIREBASE_SEED=true
```

2. Temporarily allow writes for seeding (DEV ONLY), then lock back down:

```javascript
match /words/{document} {
  allow read: if true;
  allow write: if true; // TEMPORARY
}
match /meta/seed {
  allow read: if true;
  allow write: if true; // TEMPORARY
}
```

3. Start the app once. It will:
- Insert the initial words in batches
- Create `meta/seed` marker so it never runs again

4. Remove `VITE_ENABLE_FIREBASE_SEED` (or set it to false) and revert rules to `allow write: if false`.

This will:
- Convert the old nested structure to the new flat structure
- Add all words from `words.tsx` to Firebase
- Set default languages and regions

### 6. Generate Sample Data (Optional)

To add sample words with languages and regions:

```bash
npx tsx scripts/generateSampleData.ts
```

This adds words like:
- Punjabi words (Roti, Paratha, Lassi)
- UK slang (Roadman, Bruv)
- Canadian words (Poutine, Tim Hortons)
- Spanish words (Taco, Fiesta)
- French words (Croissant, Baguette)

### 7. Create Firestore Indexes (Optional but Recommended)

For better query performance, create composite indexes:

1. Go to **Firestore Database** > **Indexes**
2. Click "Create Index"
3. Create these indexes:
   - Collection: `words`
     - Fields: `category` (Ascending), `languages` (Arrays), `regions` (Arrays)
   - Collection: `words`
     - Fields: `category` (Ascending), `difficulty` (Ascending)

## Data Structure

### Word Document Schema

```typescript
{
  word: string;                    // The actual word (e.g., "Pizza")
  category: string;               // Category name (e.g., "Food")
  difficulty?: "easy" | "medium" | "hard";
  languages?: string[];            // Array of languages (e.g., ["English", "Punjabi"])
  regions?: string[];              // Array of regions (e.g., ["Punjab", "Toronto"])
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Example Documents

```json
{
  "word": "Roti",
  "category": "Food",
  "difficulty": "easy",
  "languages": ["Punjabi", "Hindi", "Urdu"],
  "regions": ["Punjab", "India"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}

{
  "word": "Roadman",
  "category": "Jobs & Professions",
  "difficulty": "medium",
  "languages": ["English"],
  "regions": ["UK", "London"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Querying Words

The app automatically queries Firebase with filters:

```typescript
// Filter by category only
fetchWords({ categories: ["Food"] })

// Filter by category and language
fetchWords({ 
  categories: ["Food"], 
  languages: ["Punjabi"] 
})

// Filter by category, language, and region
fetchWords({ 
  categories: ["Food"], 
  languages: ["Punjabi", "Hindi"],
  regions: ["Punjab", "India"]
})
```

## Fallback Behavior

If Firebase is unavailable or returns no results, the app automatically falls back to the local `words.tsx` file. This ensures the game always works, even without Firebase.

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file has all Firebase config variables
- Restart the dev server after adding `.env` file

### "Permission denied" errors
- Check Firestore security rules
- Make sure read access is allowed for the `words` collection

### No words showing up
- Run the migration script: `npx tsx scripts/migrateWordsToFirebase.ts`
- Check Firebase Console to verify words were added
- Check browser console for errors

### Queries are slow
- Create composite indexes in Firestore (see step 7 above)
- Limit the number of categories/languages/regions in filters

## Next Steps

- Add more words with different languages and regions
- Implement user-generated words (requires authentication)
- Add word ratings or popularity scores
- Implement caching for better performance
