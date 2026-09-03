import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import CategoriesSelector, { type SelectedFilters } from "../components/CategoriesSelector";
import { fetchCategories } from "../services/wordsService";
import { ALL_CATEGORIES } from "../constants/categories";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";

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

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleCreateRoom = () => {
    setError(null);
    setShowComingSoon(true);
  };

  return (
    <LobbyShell
      badge="Multiplayer"
      title={UI_STRINGS.MULTI_CREATE_ROOM}
      subtitle="Configure your game settings"
      wide
    >
      <div className={s.banner} role="status">
        This module is coming soon in the next update. We&apos;re focusing on AI for now.
      </div>

      {showComingSoon && (
        <div className={s.info} role="alert">
          <strong>Room creation is coming soon</strong> in the next update. We&apos;re
          focusing on AI for now — try &quot;Generate words (AI)&quot; in the categories
          section below.
          {selectedFilters.categories.length > 0 ||
          selectedFilters.languages.length > 0 ||
          selectedFilters.regions.length > 0
            ? " Your current filters will be used when this is available."
            : null}
        </div>
      )}
      {error && <div className={s.error}>{error}</div>}

      <div className={s.settingsBlock}>
        <h3 className={s.sectionTitle}>Game Settings</h3>
        <CategoriesSelector
          baseCategories={categoryNames}
          onChangeSelected={setSelectedFilters}
        />
      </div>

      <div className={s.actionsRow}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className={s.ctaGhost}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreateRoom}
          className={s.ctaPrimary}
        >
          Create Room
        </button>
      </div>
    </LobbyShell>
  );
}
