import React, { useEffect, useState } from "react";
import styles from "./CategoriesSelector.module.css";

export type FilterItemType = "category" | "language" | "region";

export type FilterItem = {
  id: string;
  label: string;
  type: FilterItemType;
  checked: boolean;
  isCustom: boolean;
};

export type SelectedFilters = {
  categories: string[];
  languages: string[];
  regions: string[];
};

type Props = {
  baseCategories?: string[];
  initialItems?: FilterItem[]; // optional if you later hydrate from store
  onChangeSelected?: (selected: SelectedFilters) => void;
};

const defaultBaseCategories = ["Food", "Animals", "Places", "Objects", "Sports", "Movies"];

export default function CategoriesSelector({
  baseCategories = defaultBaseCategories,
  initialItems,
  onChangeSelected,
}: Props) {
  const [items, setItems] = useState<FilterItem[]>(
    initialItems ??
      baseCategories.map((label, idx) => ({
        id: `cat_${idx}`,
        label,
        type: "category" as const,
        checked: true,
        isCustom: false,
      }))
  );

  const [languageInput, setLanguageInput] = useState("");
  const [regionInput, setRegionInput] = useState("");

  // Emit selection upwards
  useEffect(() => {
    if (!onChangeSelected) return;
    const selected: SelectedFilters = {
      categories: items
        .filter((i) => i.type === "category" && i.checked)
        .map((i) => i.label),
      languages: items
        .filter((i) => i.type === "language" && i.checked)
        .map((i) => i.label),
      regions: items
        .filter((i) => i.type === "region" && i.checked)
        .map((i) => i.label),
    };
    onChangeSelected(selected);
  }, [items, onChangeSelected]);

  const addItem = (raw: string, type: FilterItemType) => {
    const value = raw.trim();
    if (!value) return;

    const exists = items.some(
      (it) =>
        it.type === type &&
        it.label.toLowerCase() === value.toLowerCase()
    );
    if (exists) return;

    const id = `${type}_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;

    setItems((prev) => [
      ...prev,
      {
        id,
        label: value,
        type,
        checked: true,
        isCustom: true,
      },
    ]);
  };

  const handleAddLanguage = () => {
    addItem(languageInput, "language");
    setLanguageInput("");
  };

  const handleAddRegion = () => {
    addItem(regionInput, "region");
    setRegionInput("");
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: FilterItemType
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (type === "language") handleAddLanguage();
      if (type === "region") handleAddRegion();
    }
  };

  const toggleChecked = (id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, checked: !it.checked } : it
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.subtext}>
        Choose built-in categories, then add <b>languages</b> and{" "}
        <b>regions</b> you care about. The game (and AI) will use these to
        pick culturally relevant words.
      </p>

      <div className={styles.inputsRow}>
        <div className={styles.inputBlock}>
          <label className={styles.label}>Preferred languages</label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              placeholder="e.g. Punjabi, Hindi, Urdu, Spanish..."
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "language")}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddLanguage}
              disabled={!languageInput.trim()}
            >
              Add
            </button>
          </div>
        </div>

        <div className={styles.inputBlock}>
          <label className={styles.label}>Preferred regions</label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              placeholder="e.g. Punjab, Haryana, Toronto, UK..."
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "region")}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddRegion}
              disabled={!regionInput.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className={styles.selectedHeader}>
        <span className={styles.selectedTitle}>Your active filters</span>
        <span className={styles.selectedHint}>
          Click to toggle. Custom items can be removed.
        </span>
      </div>

      <div className={styles.chipsWrap}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.chip} ${
              item.checked ? styles.chipActive : styles.chipInactive
            }`}
          >
            <button
              type="button"
              className={styles.chipMain}
              onClick={() => toggleChecked(item.id)}
            >
              <span
                className={`${styles.checkbox} ${
                  item.checked ? styles.checkboxChecked : ""
                }`}
              />
              <span className={styles.chipLabel}>
                {item.label}
                <span className={styles.chipTag}>
                  {item.type === "category"
                    ? "Category"
                    : item.type === "language"
                    ? "Language"
                    : "Region"}
                </span>
              </span>
            </button>

            {item.isCustom && (
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                × X
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
