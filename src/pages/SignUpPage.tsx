import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isValidEmail } from "../services/authService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import styles from "./LoginPage.module.css";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signInGoogle, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Pre-fill email from query params and show message if redirected from login
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const messageParam = searchParams.get("message");
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (messageParam) {
      setError(messageParam);
    }
  }, [searchParams]);

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

  // Redirect if already logged in or just returned from Google redirect
  useEffect(() => {
    if (user && !loading) {
      // If we're on signup/login page and user is logged in, go to home
      if (window.location.pathname === ROUTES.SIGNUP || window.location.pathname === ROUTES.LOGIN) {
        navigate(ROUTES.HOME, { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    
    // Validate email
    if (!isValidEmail(email)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
      return;
    }
    
    // Validate display name
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    
    setIsSubmitting(true);

    try {
      await signUp(email, password, displayName);
      navigate(ROUTES.HOME);
    } catch (err: any) {
      console.error("Sign up error:", err);
      const errorCode = err.code;
      if (errorCode === "auth/invalid-email") {
        setError(UI_STRINGS.AUTH_ERROR_INVALID_EMAIL);
      } else if (errorCode === "auth/weak-password") {
        setError(UI_STRINGS.AUTH_ERROR_WEAK_PASSWORD);
      } else if (errorCode === "auth/email-already-in-use") {
        setError(UI_STRINGS.AUTH_ERROR_EMAIL_IN_USE);
      } else if (errorCode === "auth/network-request-failed") {
        setError(UI_STRINGS.AUTH_ERROR_NETWORK);
      } else {
        setError(err.message || "Failed to sign up");
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
        // The page will reload after redirect, AuthContext will handle navigation
        return;
      }
      // Handle "too few permissions" or other errors
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setError("Sign-up was cancelled. Please try again.");
      } else if (err.message?.includes("permissions")) {
        setError("Please grant all requested permissions to complete sign up.");
      } else {
        setError(err.message || "Failed to sign up with Google");
      }
      setIsSubmitting(false);
    }
  };

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
        <h1 className={styles.title}>{UI_STRINGS.AUTH_SIGN_UP}</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              {UI_STRINGS.AUTH_DISPLAY_NAME}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.input}
              required
              disabled={isSubmitting}
            />
          </div>

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
              minLength={6}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting || !!emailError}
          >
            {isSubmitting ? "Signing up..." : UI_STRINGS.AUTH_SIGN_UP}
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
          {UI_STRINGS.AUTH_GOOGLE_SIGN_UP}
        </button>

        <div className={styles.footer}>
          <p>
            {UI_STRINGS.AUTH_HAVE_ACCOUNT}{" "}
            <Link to={ROUTES.LOGIN} className={styles.link}>
              {UI_STRINGS.AUTH_SIGN_IN_LINK}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}