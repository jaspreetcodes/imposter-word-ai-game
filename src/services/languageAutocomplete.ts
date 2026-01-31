/**
 * Language autocomplete service
 * Uses REST Countries API (free, no API key required) to fetch languages
 * Falls back to static list for instant results and offline support
 * 
 * REST Countries API: https://restcountries.com/
 * Free, no API key required, unlimited requests
 */

export interface LanguageSuggestion {
  name: string;
  nativeName?: string;
  code: string;
}

// interface CountryLanguage {
//   name: string;
//   nativeName?: string;
//   iso639_1?: string;
//   iso639_2?: string;
// }

interface Country {
  languages: Record<string, string>;
  name: {
    common: string;
    official: string;
  };
}

// Comprehensive list of languages and dialects
const LANGUAGES: LanguageSuggestion[] = [
  // Indo-Aryan languages
  { name: "Hindi", nativeName: "हिन्दी", code: "hi" },
  { name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", code: "pa" },
  { name: "Urdu", nativeName: "اردو", code: "ur" },
  { name: "Bengali", nativeName: "বাংলা", code: "bn" },
  { name: "Gujarati", nativeName: "ગુજરાતી", code: "gu" },
  { name: "Marathi", nativeName: "मराठी", code: "mr" },
  { name: "Tamil", nativeName: "தமிழ்", code: "ta" },
  { name: "Telugu", nativeName: "తెలుగు", code: "te" },
  { name: "Kannada", nativeName: "ಕನ್ನಡ", code: "kn" },
  { name: "Malayalam", nativeName: "മലയാളം", code: "ml" },
  { name: "Odia", nativeName: "ଓଡ଼ିଆ", code: "or" },
  { name: "Assamese", nativeName: "অসমীয়া", code: "as" },
  { name: "Sanskrit", nativeName: "संस्कृतम्", code: "sa" },
  
  // European languages
  { name: "English", code: "en" },
  { name: "Spanish", nativeName: "Español", code: "es" },
  { name: "French", nativeName: "Français", code: "fr" },
  { name: "German", nativeName: "Deutsch", code: "de" },
  { name: "Italian", nativeName: "Italiano", code: "it" },
  { name: "Portuguese", nativeName: "Português", code: "pt" },
  { name: "Russian", nativeName: "Русский", code: "ru" },
  { name: "Dutch", nativeName: "Nederlands", code: "nl" },
  { name: "Polish", nativeName: "Polski", code: "pl" },
  { name: "Greek", nativeName: "Ελληνικά", code: "el" },
  { name: "Swedish", nativeName: "Svenska", code: "sv" },
  { name: "Norwegian", nativeName: "Norsk", code: "no" },
  { name: "Danish", nativeName: "Dansk", code: "da" },
  { name: "Finnish", nativeName: "Suomi", code: "fi" },
  { name: "Czech", nativeName: "Čeština", code: "cs" },
  { name: "Romanian", nativeName: "Română", code: "ro" },
  { name: "Hungarian", nativeName: "Magyar", code: "hu" },
  { name: "Bulgarian", nativeName: "Български", code: "bg" },
  { name: "Croatian", nativeName: "Hrvatski", code: "hr" },
  { name: "Serbian", nativeName: "Српски", code: "sr" },
  { name: "Slovak", nativeName: "Slovenčina", code: "sk" },
  { name: "Slovenian", nativeName: "Slovenščina", code: "sl" },
  
  // Middle Eastern languages
  { name: "Arabic", nativeName: "العربية", code: "ar" },
  { name: "Hebrew", nativeName: "עברית", code: "he" },
  { name: "Persian", nativeName: "فارسی", code: "fa" },
  { name: "Turkish", nativeName: "Türkçe", code: "tr" },
  
  // East Asian languages
  { name: "Chinese", nativeName: "中文", code: "zh" },
  { name: "Mandarin", nativeName: "普通话", code: "zh-CN" },
  { name: "Cantonese", nativeName: "粵語", code: "zh-HK" },
  { name: "Japanese", nativeName: "日本語", code: "ja" },
  { name: "Korean", nativeName: "한국어", code: "ko" },
  { name: "Vietnamese", nativeName: "Tiếng Việt", code: "vi" },
  { name: "Thai", nativeName: "ไทย", code: "th" },
  { name: "Indonesian", nativeName: "Bahasa Indonesia", code: "id" },
  { name: "Malay", nativeName: "Bahasa Melayu", code: "ms" },
  { name: "Tagalog", nativeName: "Tagalog", code: "tl" },
  { name: "Filipino", nativeName: "Filipino", code: "fil" },
  
  // African languages
  { name: "Swahili", nativeName: "Kiswahili", code: "sw" },
  { name: "Afrikaans", code: "af" },
  { name: "Amharic", nativeName: "አማርኛ", code: "am" },
  { name: "Yoruba", nativeName: "Yorùbá", code: "yo" },
  { name: "Igbo", nativeName: "Asụsụ Igbo", code: "ig" },
  { name: "Hausa", nativeName: "Hausa", code: "ha" },
  { name: "Zulu", nativeName: "isiZulu", code: "zu" },
  { name: "Xhosa", nativeName: "isiXhosa", code: "xh" },
  
  // Other languages
  { name: "Esperanto", code: "eo" },
  { name: "Latin", nativeName: "Latina", code: "la" },
];

// Cache for API-fetched languages
let cachedLanguages: LanguageSuggestion[] | null = null;
let isFetching = false;
let fetchPromise: Promise<LanguageSuggestion[]> | null = null;

/**
 * Fetch languages from REST Countries API
 * This API is free and doesn't require an API key
 */
async function fetchLanguagesFromAPI(): Promise<LanguageSuggestion[]> {
  if (cachedLanguages) {
    return cachedLanguages;
  }

  if (isFetching && fetchPromise) {
    return fetchPromise;
  }

  isFetching = true;
  fetchPromise = fetch("https://restcountries.com/v3.1/all?fields=languages,name")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`REST Countries API error: ${response.status}`);
      }

      const countries: Country[] = await response.json();
      const languageMap = new Map<string, LanguageSuggestion>();

      // Extract all languages from all countries
      countries.forEach((country) => {
        if (country.languages) {
          Object.entries(country.languages).forEach(([code, name]) => {
            // Use ISO 639-1 code (2 letters) or fallback to longer code
            const langCode = code.length === 2 ? code : code.split("-")[0] || code;
            
            if (!languageMap.has(langCode)) {
              languageMap.set(langCode, {
                name: name,
                code: langCode,
              });
            }
          });
        }
      });

      // Convert map to array and merge with static list
      const apiLanguages = Array.from(languageMap.values());
      
      // Merge with static list, prioritizing static list for native names
      const mergedLanguages = new Map<string, LanguageSuggestion>();
      
      // Add static languages first (they have native names)
      LANGUAGES.forEach((lang) => {
        mergedLanguages.set(lang.code.toLowerCase(), lang);
      });
      
      // Add API languages if not already present
      apiLanguages.forEach((lang) => {
        const key = lang.code.toLowerCase();
        if (!mergedLanguages.has(key)) {
          mergedLanguages.set(key, lang);
        } else {
          // Update existing entry with API name if static doesn't have native name
          const existing = mergedLanguages.get(key)!;
          if (!existing.nativeName && lang.name) {
            existing.name = lang.name;
          }
        }
      });

      cachedLanguages = Array.from(mergedLanguages.values());
      isFetching = false;
      fetchPromise = null;
      return cachedLanguages;
    })
    .catch((error) => {
      console.error("Error fetching languages from API:", error);
      isFetching = false;
      fetchPromise = null;
      // Return static list as fallback
      return LANGUAGES;
    });

  return fetchPromise;
}

/**
 * Get language suggestions based on query
 * Uses static list for instant results, then enhances with API data
 * @param query - Search query
 * @param limit - Maximum number of results (default: 10)
 * @param useAPI - Whether to fetch from API (default: true)
 * @returns Promise with array of matching language suggestions
 */
export async function getLanguageSuggestions(
  query: string,
  limit: number = 10,
  useAPI: boolean = true
): Promise<LanguageSuggestion[]> {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  
  // Start with static list for instant results
  let languagesToSearch = LANGUAGES;
  
  // Fetch from API in background if enabled (only once, then cached)
  if (useAPI) {
    try {
      const apiLanguages = await fetchLanguagesFromAPI();
      languagesToSearch = apiLanguages;
    } catch (error) {
      // Fallback to static list on error
      console.warn("Using static language list due to API error:", error);
    }
  }
  
  // Filter languages that match the query
  const matches = languagesToSearch.filter((lang) => {
    const nameMatch = lang.name.toLowerCase().includes(lowerQuery);
    const nativeMatch = lang.nativeName?.toLowerCase().includes(lowerQuery);
    const codeMatch = lang.code.toLowerCase().includes(lowerQuery);
    return nameMatch || nativeMatch || codeMatch;
  });

  // Sort by relevance (exact matches first, then starts with, then contains)
  const sorted = matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    if (aName === lowerQuery) return -1;
    if (bName === lowerQuery) return 1;
    if (aName.startsWith(lowerQuery)) return -1;
    if (bName.startsWith(lowerQuery)) return 1;
    return 0;
  });

  return sorted.slice(0, limit);
}

/**
 * Synchronous version that uses only static list
 * Use this for instant results without waiting for API
 */
export function getLanguageSuggestionsSync(
  query: string,
  limit: number = 10
): LanguageSuggestion[] {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  
  const matches = LANGUAGES.filter((lang) => {
    const nameMatch = lang.name.toLowerCase().includes(lowerQuery);
    const nativeMatch = lang.nativeName?.toLowerCase().includes(lowerQuery);
    const codeMatch = lang.code.toLowerCase().includes(lowerQuery);
    return nameMatch || nativeMatch || codeMatch;
  });

  const sorted = matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    if (aName === lowerQuery) return -1;
    if (bName === lowerQuery) return 1;
    if (aName.startsWith(lowerQuery)) return -1;
    if (bName.startsWith(lowerQuery)) return 1;
    return 0;
  });

  return sorted.slice(0, limit);
}
