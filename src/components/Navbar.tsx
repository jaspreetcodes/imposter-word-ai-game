import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import styles from "./Navbar.module.css";
import { GAME_NAME, ROUTES } from "../constants/strings";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  return (
    <nav className={styles.navbar}>
      <h1 style={{ cursor: "pointer" }} onClick={() => navigate(ROUTES.HOME)} className={styles.title}>{GAME_NAME}</h1>
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
    </nav>
  );
}

