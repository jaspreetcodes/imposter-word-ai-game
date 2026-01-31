import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import CategoriesSelector, { type SelectedFilters } from "../components/CategoriesSelector";
import { fetchCategories } from "../services/wordsService";
import { ALL_CATEGORIES } from "../constants/categories";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import styles from "./CreateRoomPage.module.css";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    categories: [],
    languages: [],
    regions: [],
  });
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Fetch categories from Firestore; merge with ALL_CATEGORIES so Names, Chemicals, etc. always appear
  useEffect(() => {
    fetchCategories()
      .then((categories) => {
        const merged = Array.from(new Set([...ALL_CATEGORIES, ...categories])).sort();
        setCategoryNames(merged);
      })
      .catch(() => {
        setCategoryNames([...ALL_CATEGORIES]);
      });
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleCreateRoom = () => {
    // Room creation deferred — show coming-soon message; focus on AI for now
    setError(null);
    setShowComingSoon(true);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.comingSoonBanner} role="status">
          This module is coming soon in the next update. We&apos;re focusing on AI for now.
        </div>

        <h1 className={styles.title}>{UI_STRINGS.MULTI_CREATE_ROOM}</h1>
        <p className={styles.subtitle}>Configure your game settings</p>

        {showComingSoon && (
          <div className={styles.comingSoonMessage} role="alert">
            <strong>Room creation is coming soon</strong> in the next update. We&apos;re focusing on AI for now — try &quot;Generate words (AI)&quot; in the categories section above. We&apos;ll be back to room creation soon.
            {selectedFilters.categories.length > 0 || selectedFilters.languages.length > 0 || selectedFilters.regions.length > 0 ? (
              <span className={styles.comingSoonNote}> Your current filters will be used when this is available.</span>
            ) : null}
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.settingsSection}>
          <h3 className={styles.sectionTitle}>Game Settings</h3>
          <CategoriesSelector
            baseCategories={categoryNames}
            onChangeSelected={setSelectedFilters}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            className={styles.createButton}
            disabled={false}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}
