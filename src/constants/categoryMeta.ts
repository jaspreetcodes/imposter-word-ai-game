/** Visual metadata for category cards (emoji + accent for setup UI). */
export const CATEGORY_META: Record<
  string,
  { emoji: string; accent: string }
> = {
  Food: { emoji: "🍜", accent: "#f59e0b" },
  Animals: { emoji: "🦁", accent: "#84cc16" },
  "Movies & TV": { emoji: "🎬", accent: "#a855f7" },
  "Sports & Games": { emoji: "⚽", accent: "#22c55e" },
  Places: { emoji: "🗺️", accent: "#3b82f6" },
  "Jobs & Professions": { emoji: "💼", accent: "#6366f1" },
  "Objects & Things": { emoji: "🏠", accent: "#14b8a6" },
  Names: { emoji: "👤", accent: "#ec4899" },
  Chemicals: { emoji: "🧪", accent: "#06b6d4" },
  Music: { emoji: "🎵", accent: "#f43f5e" },
  Science: { emoji: "🔬", accent: "#8b5cf6" },
  "Basic Words": { emoji: "📝", accent: "#64748b" },
  "Colors & Shades": { emoji: "🎨", accent: "#e879f9" },
  Entertainment: { emoji: "🎭", accent: "#fb923c" },
  "Famous People": { emoji: "⭐", accent: "#fbbf24" },
  Geography: { emoji: "🌍", accent: "#0ea5e9" },
  Literature: { emoji: "📚", accent: "#78716c" },
  Artists: { emoji: "🖼️", accent: "#d946ef" },
  Technology: { emoji: "💻", accent: "#38bdf8" },
};

export function getCategoryMeta(name: string): { emoji: string; accent: string } {
  return (
    CATEGORY_META[name] ?? {
      emoji: "✨",
      accent: "#818cf8",
    }
  );
}
