/** Bundled geo-linguistic presets: one selectable tag = language + region together. */
export interface LocalePreset {
  id: string;
  label: string;
  language: string;
  region: string;
  emoji: string;
}

export const LOCALE_PRESETS: LocalePreset[] = [
  { id: "en-uk", label: "English · UK", language: "English", region: "UK", emoji: "🇬🇧" },
  { id: "en-us", label: "English · US", language: "English", region: "US", emoji: "🇺🇸" },
  { id: "en-ca", label: "English · Canada", language: "English", region: "Canada", emoji: "🇨🇦" },
  { id: "fr-fr", label: "French · France", language: "French", region: "France", emoji: "🇫🇷" },
  { id: "hi-in", label: "Hindi · India", language: "Hindi", region: "India", emoji: "🇮🇳" },
  { id: "pa-in", label: "Punjabi · India", language: "Punjabi", region: "India", emoji: "🇮🇳" },
  { id: "pa-pb", label: "Punjabi · Punjab", language: "Punjabi", region: "Punjab", emoji: "🌾" },
  { id: "ur-in", label: "Urdu · India", language: "Urdu", region: "India", emoji: "🇵🇰" },
  { id: "es-mx", label: "Spanish · Mexico", language: "Spanish", region: "Mexico", emoji: "🇲🇽" },
  { id: "es-es", label: "Spanish · Spain", language: "Spanish", region: "Spain", emoji: "🇪🇸" },
];
