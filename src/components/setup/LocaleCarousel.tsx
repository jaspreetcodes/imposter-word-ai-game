import { useEffect, useRef, type RefObject } from "react";
import { Globe, Sparkles } from "lucide-react";
import { LOCALE_PRESETS, type LocalePreset } from "../../constants/localePresets";
import { localesMatch } from "../../utils/customLocales";
import type { LocaleValue } from "./LocalePicker.types";
import CarouselTrack from "./CarouselTrack";
import styles from "./ThemeCarousel.module.css";
import { UI_STRINGS } from "../../constants/strings";

type Props = {
  value: LocaleValue;
  onChange: (next: LocaleValue) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
  /** AI-generated or user-added locales shown in a dedicated row above built-in presets. */
  extraPresets?: LocalePreset[];
};

function isActive(value: LocaleValue, preset: LocalePreset) {
  return localesMatch(value, {
    language: preset.language,
    region: preset.region,
  });
}

function dedupePresets(items: LocalePreset[]): LocalePreset[] {
  const seen = new Set<string>();
  const out: LocalePreset[] = [];
  for (const p of items) {
    const key = `${p.language}::${p.region}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function PresetTrack({
  presets,
  value,
  onChange,
  disabled,
  activeRef,
}: {
  presets: LocalePreset[];
  value: LocaleValue;
  onChange: (next: LocaleValue) => void;
  disabled?: boolean;
  activeRef?: RefObject<HTMLButtonElement | null>;
}) {
  if (presets.length === 0) return null;

  return (
    <CarouselTrack>
      {presets.map((preset) => {
        const active = isActive(value, preset);
        return (
          <button
            key={preset.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="listitem"
            data-cy="locale-card"
            data-language={preset.language}
            data-region={preset.region}
            data-selected={active}
            className={`${styles.card} ${active ? styles.cardSelected : ""} ${
              preset.id.startsWith("custom-") ? styles.cardCustom : ""
            }`}
            onClick={() =>
              onChange({ language: preset.language, region: preset.region })
            }
            disabled={disabled}
            aria-pressed={active}
          >
            <span className={styles.cardIconWrap}>
              <span className={styles.cardIcon} aria-hidden>
                {preset.emoji}
              </span>
            </span>
            <p className={styles.cardLabel}>{preset.language}</p>
            <p className={styles.cardMeta}>{preset.region}</p>
          </button>
        );
      })}
    </CarouselTrack>
  );
}

export default function LocaleCarousel({
  value,
  onChange,
  disabled,
  title = "Language & region",
  hint,
  extraPresets = [],
}: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const customPresets = dedupePresets(extraPresets);
  const builtInPresets = dedupePresets(
    LOCALE_PRESETS.filter(
      (p) =>
        !customPresets.some((c) =>
          localesMatch(
            { language: c.language, region: c.region },
            { language: p.language, region: p.region }
          )
        )
    )
  );
  const totalPresets = customPresets.length + builtInPresets.length;
  const scrollHint =
    totalPresets > 2 ? UI_STRINGS.SETUP_SCROLL_CAROUSEL_HINT : undefined;
  const combinedHint = [hint, scrollHint].filter(Boolean).join(" ");

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value.language, value.region, customPresets.length, builtInPresets.length]);

  return (
    <section className={styles.section} aria-label={title} data-cy="locale-carousel">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Globe size={18} className={styles.titleIcon} aria-hidden />
          {title}
        </h3>
      </div>
      {combinedHint ? <p className={styles.hint}>{combinedHint}</p> : null}

      {customPresets.length > 0 && (
        <div className={styles.subsection}>
          <p className={styles.subsectionTitle}>
            <Sparkles size={14} aria-hidden />
            Your generated locales
          </p>
          <PresetTrack
            presets={customPresets}
            value={value}
            onChange={onChange}
            disabled={disabled}
            activeRef={activeRef}
          />
        </div>
      )}

      <div className={customPresets.length > 0 ? styles.subsection : undefined}>
        {customPresets.length > 0 && (
          <p className={styles.subsectionTitle}>Built-in presets</p>
        )}
        <PresetTrack
          presets={builtInPresets}
          value={value}
          onChange={onChange}
          disabled={disabled}
          activeRef={customPresets.length === 0 ? activeRef : undefined}
        />
      </div>
    </section>
  );
}
