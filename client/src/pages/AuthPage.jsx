import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Brand, Button, ErrorNotice } from "../components/ui";
import ThemeToggle from "../theme/ThemeToggle";
import { api, errorMessage, safeDestination } from "../lib/api";
import "./auth.css";

export default function AuthPage({ mode }) {
  const register = mode === "register";
  const navigate = useNavigate();
  const returnTo = new URLSearchParams(useLocation().search).get("returnTo");
  const destination = safeDestination(returnTo);
  const suffix = returnTo ? `?returnTo=${encodeURIComponent(destination)}` : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (register && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.post(register ? "/register" : "/login", {
        ...(register ? { username: name.trim() } : {}),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(
        errorMessage(requestError, "Could not sign you in. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Brand />
        <ThemeToggle />
      </header>
      <section className="auth-card panel">
        <h1>{register ? "Create your account" : "Sign in"}</h1>
        <p className="auth-subtitle">
          {register
            ? "Get started with Abyuday."
            : "Continue to your assessment workspace."}
        </p>
        <Button
          variant="secondary"
          className="btn-block"
          disabled={busy}
          onClick={() => {
            window.location.href = `/auth/google?returnTo=${encodeURIComponent(destination)}`;
          }}
        >
          Continue with Google
        </Button>
        <div className="auth-divider">
          <span>or use email</span>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {register && (
            <label className="field">
              Name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label className="field">
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={register ? 8 : undefined}
                maxLength={128}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {register && <small>At least 8 characters.</small>}
          </label>
          {register && (
            <label className="field">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                maxLength={128}
              />
            </label>
          )}
          <ErrorNotice message={error} />
          <Button type="submit" className="btn-block" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="auth-alternate">
          {register ? "Already have an account?" : "New to Abyuday?"}{" "}
          <Link to={`${register ? "/login" : "/register"}${suffix}`}>
            {register ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
      <footer className="auth-footer">
        <Link to="/">Back to home</Link>
      </footer>
    </main>
  );
}
