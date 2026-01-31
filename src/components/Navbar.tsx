import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import styles from "./Navbar.module.css";
import { GAME_NAME, ROUTES, UI_STRINGS } from "../constants/strings";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfile]);

  const handleSignOut = async () => {
    await signOut();
    setShowProfile(false);
    navigate(ROUTES.HOME);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logoContainer} onClick={() => navigate(ROUTES.HOME)}>
        <img src="/vite.svg" alt="Logo" className={styles.logo} />
        <h1 className={styles.title}>{GAME_NAME}</h1>
      </div>
      
      <div className={styles.rightSection}>
        {user ? (
          <div className={styles.profileContainer} ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className={styles.profileButton}
              aria-label="User profile"
            >
              <div className={styles.avatar}>
                {profile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className={styles.profileName}>
                {profile?.displayName || user.email?.split("@")[0] || "User"}
              </span>
            </button>
            
            {showProfile && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileInfo}>
                  <div className={styles.profileEmail}>{user.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className={styles.signOutButton}
                >
                  {UI_STRINGS.AUTH_SIGN_OUT}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className={styles.signInButton}
          >
            {UI_STRINGS.AUTH_SIGN_IN}
          </button>
        )}
        
        <button
          onClick={toggleTheme}
          className={styles.toggleButton}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}

