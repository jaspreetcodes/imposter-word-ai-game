# Region Autocomplete Debugging Guide

## Test Cases

Try typing these in the "Preferred regions" input field:

1. **"Tor"** - Should show Toronto, Toronto Island, etc.
2. **"New"** - Should show New York, New Delhi, New Orleans, etc.
3. **"Lon"** - Should show London, Long Beach, etc.
4. **"Pun"** - Should show Punjab, Pune, etc.
5. **"Cal"** - Should show California, Calgary, Calcutta, etc.

## Debugging Steps

### 1. Check API Key
- Open browser console (F12)
- Type in the region field
- Look for: `"Geoapify: API key not configured"` or `"Geoapify: Starting fetch for: [your input]"`

### 2. Check API Response
- In console, look for: `"Geoapify: Raw API response:"`
- This shows the actual API response structure

### 3. Check Processed Suggestions
- Look for: `"Geoapify: Processed suggestions:"`
- This shows what suggestions were extracted

### 4. Check State Updates
- Look for: `"Region input changed: [value]"`
- This confirms the input is updating

## Common Issues

### Issue: No suggestions appear
**Possible causes:**
1. API key not set or is "your_api_key_here"
2. API key invalid
3. Network error (check console)
4. API response format changed

**Solution:**
- Check `.env` file has valid API key
- Restart dev server after changing `.env`
- Check browser console for errors

### Issue: "Loading..." appears but no results
**Possible causes:**
1. API returned empty results
2. Response format doesn't match expected structure
3. API rate limit exceeded

**Solution:**
- Check console for "Geoapify: Raw API response"
- Verify API key is valid
- Check Geoapify dashboard for usage limits

### Issue: Suggestions appear but can't click them
**Possible causes:**
1. CSS z-index issue
2. Click handler not working
3. Dropdown closing before click

**Solution:**
- Check browser console for errors
- Try keyboard navigation (Arrow keys + Enter)

## Expected Console Output

When working correctly, you should see:
```
Region input changed: Tor
Geoapify: Starting fetch for: Tor
Geoapify: Fetching suggestions for: Tor
Geoapify: Raw API response: {results: [...]}
Geoapify: Processed suggestions: [{formatted: "Toronto, ON, Canada", ...}]
```

## Manual Testing

1. Open the app
2. Click "Select Categories" button
3. Type in "Preferred regions" field
4. Wait 300ms (debounce delay)
5. Check console for logs
6. Check if dropdown appears

## API Key Setup

1. Get free API key: https://www.geoapify.com/get-started-with-maps-api
2. Add to `.env` file:
   ```
   VITE_GEOAPIFY_API_KEY=your_actual_key_here
   ```
3. Restart dev server: `npm run dev`
