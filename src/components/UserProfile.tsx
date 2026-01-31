import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UI_STRINGS } from "../constants/strings";
import styles from "./UserProfile.module.css";

export default function UserProfile() {
  const { user, profile, updateUserDisplayName, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateUserDisplayName(displayName.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update display name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile?.displayName || "");
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.avatar}>
        {profile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
      </div>
      
      {isEditing ? (
        <div className={styles.editForm}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.input}
            placeholder={UI_STRINGS.AUTH_DISPLAY_NAME}
            disabled={isSaving}
          />
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button
              onClick={handleSave}
              className={styles.saveButton}
              disabled={isSaving}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.info}>
          <div className={styles.name}>{profile?.displayName || user.email || "User"}</div>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.actions}>
            <button
              onClick={() => setIsEditing(true)}
              className={styles.editButton}
            >
              Edit Name
            </button>
            <button
              onClick={signOut}
              className={styles.signOutButton}
            >
              {UI_STRINGS.AUTH_SIGN_OUT}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
