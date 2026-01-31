# Manual Firestore Entry Guide

You can manually add words to Firestore through the Firebase Console UI, but it's time-consuming for large datasets.

## How to Add Words Manually

### Step 1: Open Firestore
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click **Start collection** (if empty) or click on the **words** collection

### Step 2: Add a Document
1. Click **Add document**
2. **Document ID**: Leave empty (Firebase will auto-generate) or enter a custom ID
3. Add the following fields:

#### Required Fields:
- `word` (string): The actual word, e.g., "Pizza"
- `category` (string): Category name, e.g., "Food"

#### Optional Fields:
- `difficulty` (string): "easy", "medium", or "hard"
- `languages` (array): Click "Add field" → Select "array" → Add items like "English", "Punjabi"
- `regions` (array): Click "Add field" → Select "array" → Add items like "US", "UK", "Canada"
- `createdAt` (timestamp): Click "Add field" → Select "timestamp" → Use current time
- `updatedAt` (timestamp): Click "Add field" → Select "timestamp" → Use current time

### Example Document Structure:

```
word: "Pizza"
category: "Food"
difficulty: "easy"
languages: ["English"]
regions: ["US", "UK", "Canada"]
createdAt: [current timestamp]
updatedAt: [current timestamp]
```

## Pros and Cons

### ✅ Pros:
- No code required
- Good for testing with a few words
- Visual interface
- Immediate feedback

### ❌ Cons:
- **Very slow** - You'd need to add ~150+ documents manually
- **Error-prone** - Easy to make typos or forget fields
- **No automation** - Can't easily update or re-run
- **Time-consuming** - Each word takes 1-2 minutes to add

## Recommendation

**For a few test words**: Manual entry is fine
**For the full dataset**: Use the migration script - it's much faster and less error-prone

## Quick Test Entry

If you just want to test with a few words manually, here's a minimal example:

1. Collection: `words`
2. Document (auto ID): 
   - `word`: "Pizza"
   - `category`: "Food"
   - `languages`: ["English"]
   - `regions`: ["US"]

That's enough to test if the filtering works!

