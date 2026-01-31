import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isValidEmail } from "../services/authService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInGoogle, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(null);
    setError(null);
    
    // Validate email in real-time
    if (value && !isValidEmail(value)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    
    // Validate email
    if (!isValidEmail(email)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
      return;
    }
    
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate(ROUTES.HOME);
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorCode = err.code;
      if (errorCode === "auth/invalid-email") {
        setError(UI_STRINGS.AUTH_ERROR_INVALID_EMAIL);
      } else if (errorCode === "auth/user-not-found") {
        // Redirect to signup page with email pre-filled
        navigate(`${ROUTES.SIGNUP}?email=${encodeURIComponent(email)}&message=${encodeURIComponent(UI_STRINGS.AUTH_USER_NOT_FOUND_MESSAGE)}`);
        return;
      } else if (errorCode === "auth/wrong-password") {
        setError(UI_STRINGS.AUTH_ERROR_WRONG_PASSWORD);
      } else if (errorCode === "auth/network-request-failed") {
        setError(UI_STRINGS.AUTH_ERROR_NETWORK);
      } else {
        setError(err.message || "Failed to sign in");
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInGoogle();
      // If popup succeeded, navigate to home
      navigate(ROUTES.HOME);
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.message === "REDIRECT_INITIATED") {
        // Redirect was initiated, don't show error
        // The page will reload after redirect
        return;
      }
      // Handle specific Google errors
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.message?.includes("permissions")) {
        setError("Please grant all requested permissions to sign in.");
      } else {
        setError(err.message || "Failed to sign in with Google");
      }
      setIsSubmitting(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>{UI_STRINGS.AUTH_SIGN_IN}</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              {UI_STRINGS.AUTH_EMAIL}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`${styles.input} ${emailError ? styles.inputError : ""}`}
              required
              disabled={isSubmitting}
            />
            {emailError && <div className={styles.fieldError}>{emailError}</div>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              {UI_STRINGS.AUTH_PASSWORD}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting || !!emailError}
          >
            {isSubmitting ? "Signing in..." : UI_STRINGS.AUTH_SIGN_IN}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className={styles.googleButton}
          disabled={isSubmitting}
        >
          {UI_STRINGS.AUTH_GOOGLE_SIGN_IN}
        </button>

        <div className={styles.footer}>
          <p>
            {UI_STRINGS.AUTH_NO_ACCOUNT}{" "}
            <Link to={ROUTES.SIGNUP} className={styles.link}>
              {UI_STRINGS.AUTH_SIGN_UP_LINK}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
