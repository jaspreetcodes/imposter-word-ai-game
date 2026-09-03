import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isValidEmail } from "../services/authService";
import { UI_STRINGS, ROUTES } from "../constants/strings";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";

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

    if (value && !isValidEmail(value)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    if (!isValidEmail(email)) {
      setEmailError(UI_STRINGS.AUTH_EMAIL_INVALID);
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate(ROUTES.HOME);
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      const errorCode = (err as { code?: string }).code;
      if (errorCode === "auth/invalid-email") {
        setError(UI_STRINGS.AUTH_ERROR_INVALID_EMAIL);
      } else if (errorCode === "auth/user-not-found") {
        navigate(
          `${ROUTES.SIGNUP}?email=${encodeURIComponent(email)}&message=${encodeURIComponent(UI_STRINGS.AUTH_USER_NOT_FOUND_MESSAGE)}`
        );
        return;
      } else if (errorCode === "auth/wrong-password") {
        setError(UI_STRINGS.AUTH_ERROR_WRONG_PASSWORD);
      } else if (errorCode === "auth/network-request-failed") {
        setError(UI_STRINGS.AUTH_ERROR_NETWORK);
      } else {
        setError((err as Error).message || "Failed to sign in");
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
        setError("Sign-in was cancelled. Please try again.");
      } else if (e.message?.includes("permissions")) {
        setError("Please grant all requested permissions to sign in.");
      } else {
        setError(e.message || "Failed to sign in with Google");
      }
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <LobbyShell title={UI_STRINGS.AUTH_SIGN_IN} subtitle="Loading…" />
    );
  }

  return (
    <LobbyShell
      badge="Online play"
      title={UI_STRINGS.AUTH_SIGN_IN}
      subtitle="Sign in to create or join rooms"
    >
      {error && (
        <div className={s.error} role="alert" data-cy="auth-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={s.form} data-cy="sign-in-form">
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
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          className={s.ctaPrimary}
          data-cy="auth-submit"
          disabled={isSubmitting || !!emailError}
        >
          {isSubmitting ? "Signing in…" : UI_STRINGS.AUTH_SIGN_IN}
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
        {UI_STRINGS.AUTH_GOOGLE_SIGN_IN}
      </button>

      <div className={s.footer}>
        <p>
          {UI_STRINGS.AUTH_NO_ACCOUNT}{" "}
          <Link to={ROUTES.SIGNUP} className={s.link}>
            {UI_STRINGS.AUTH_SIGN_UP_LINK}
          </Link>
        </p>
      </div>
    </LobbyShell>
  );
}
