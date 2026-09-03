import { LayoutGrid } from "lucide-react";
import { getCategoryMeta } from "../../constants/categoryMeta";
import { formatCategoryLabel } from "../../utils/normalizeCategory";
import CarouselTrack from "./CarouselTrack";
import styles from "./ThemeCarousel.module.css";

type Props = {
  categories: string[];
  wordCounts: Record<string, number>;
  selected: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
};

export default function CategoryCarousel({
  categories,
  wordCounts,
  selected,
  onChange,
  disabled,
  title = "Word theme",
  hint,
}: Props) {
  const toggle = (name: string) => {
    if (disabled) return;
    if (selected.includes(name)) {
      onChange(selected.filter((c) => c !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label={title} data-cy="category-carousel">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <LayoutGrid size={18} className={styles.titleIcon} aria-hidden />
          {title}
        </h3>
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <CarouselTrack>
        {categories.map((name) => {
          const meta = getCategoryMeta(name);
          const count = wordCounts[name] ?? 0;
          const isSelected = selected.includes(name);
          const label = formatCategoryLabel(name);
          return (
            <button
              key={name}
              type="button"
              role="listitem"
              data-cy="category-card"
              data-category={name}
              data-selected={isSelected}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
              onClick={() => toggle(name)}
              disabled={disabled}
              aria-pressed={isSelected}
            >
              <span
                className={styles.cardIconWrap}
                style={{ boxShadow: isSelected ? `0 0 20px ${meta.accent}40` : undefined }}
              >
                <span className={styles.cardIcon} aria-hidden>
                  {meta.emoji}
                </span>
              </span>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardMeta}>
                {count === 1 ? "1 word" : `${count} words`}
              </p>
            </button>
          );
        })}
      </CarouselTrack>
    </section>
  );
}
