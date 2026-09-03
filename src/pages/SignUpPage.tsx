import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isValidEmail } from "../services/authService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";

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

    if (value && !isValidEmail(value)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      if (
        window.location.pathname === ROUTES.SIGNUP ||
        window.location.pathname === ROUTES.LOGIN
      ) {
        navigate(ROUTES.HOME, { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    if (!isValidEmail(email)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
      return;
    }

    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp(email, password, displayName);
      navigate(ROUTES.HOME);
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      const errorCode = (err as { code?: string }).code;
      if (errorCode === "auth/invalid-email") {
        setError(UI_STRINGS.AUTH_ERROR_INVALID_EMAIL);
      } else if (errorCode === "auth/weak-password") {
        setError(UI_STRINGS.AUTH_ERROR_WEAK_PASSWORD);
      } else if (errorCode === "auth/email-already-in-use") {
        setError(UI_STRINGS.AUTH_ERROR_EMAIL_IN_USE);
      } else if (errorCode === "auth/network-request-failed") {
        setError(UI_STRINGS.AUTH_ERROR_NETWORK);
      } else {
        setError((err as Error).message || "Failed to sign up");
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
      navigate(ROUTES.HOME);
    } catch (err: unknown) {
      console.error("Google sign in error:", err);
      const e = err as { code?: string; message?: string };
      if (e.message === "REDIRECT_INITIATED") {
        return;
      }
      if (
        e.code === "auth/popup-closed-by-user" ||
        e.code === "auth/cancelled-popup-request"
      ) {
        setError("Sign-up was cancelled. Please try again.");
      } else if (e.message?.includes("permissions")) {
        setError("Please grant all requested permissions to complete sign up.");
      } else {
        setError(e.message || "Failed to sign up with Google");
      }
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <LobbyShell title={UI_STRINGS.AUTH_SIGN_UP} subtitle="Loading…" />
    );
  }

  return (
    <LobbyShell
      badge="Online play"
      title={UI_STRINGS.AUTH_SIGN_UP}
      subtitle="Create an account to host or join rooms"
    >
      {error && (
        <div className={s.error} role="alert" data-cy="auth-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={s.form} data-cy="sign-up-form">
        <div className={s.field}>
          <label htmlFor="displayName" className={s.label}>
            {UI_STRINGS.AUTH_DISPLAY_NAME}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={s.input}
            data-cy="auth-display-name"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className={s.field}>
          <label htmlFor="email" className={s.label}>
            {UI_STRINGS.AUTH_EMAIL}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`${s.input} ${emailError ? s.inputError : ""}`}
            data-cy="auth-email"
            required
            disabled={isSubmitting}
          />
          {emailError && (
            <div className={s.fieldError} data-cy="auth-email-error">
              {emailError}
            </div>
          )}
        </div>

        <div className={s.field}>
          <label htmlFor="password" className={s.label}>
            {UI_STRINGS.AUTH_PASSWORD}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={s.input}
            data-cy="auth-password"
            required
            minLength={6}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          className={s.ctaPrimary}
          data-cy="auth-submit"
          disabled={isSubmitting || !!emailError}
        >
          {isSubmitting ? "Signing up…" : UI_STRINGS.AUTH_SIGN_UP}
        </button>
      </form>

      <div className={s.divider}>
        <span>or</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className={s.googleButton}
        data-cy="auth-google"
        disabled={isSubmitting}
      >
        {UI_STRINGS.AUTH_GOOGLE_SIGN_UP}
      </button>

      <div className={s.footer}>
        <p>
          {UI_STRINGS.AUTH_HAVE_ACCOUNT}{" "}
          <Link to={ROUTES.LOGIN} className={s.link}>
            {UI_STRINGS.AUTH_SIGN_IN_LINK}
          </Link>
        </p>
      </div>
    </LobbyShell>
  );
}
