"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

export function AccountForm({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [recovery, setRecovery] = useState("");
  const [savedCode, setSavedCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change(next: typeof mode) {
    setMode(next);
    setError("");
    setPassword("");
    setRecovery("");
    setVisible(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const action = savedCode ? "login" : mode;
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          email,
          password,
          displayName: name,
          recoveryCode: recovery,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Couldn’t complete sign-in. Please try again.",
        );
      if (result.recoveryCode) {
        setSavedCode(result.recoveryCode);
        setAcknowledged(false);
      } else window.location.assign("/explore");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t reach QuestGo. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="account-form" onSubmit={(event) => void submit(event)}>
      {savedCode ? (
        <>
          <h3>Keep your recovery code.</h3>
          <p>
            Your{" "}
            {mode === "recover"
              ? "password has been changed"
              : "account is ready"}
            . Save this code somewhere private. You’ll need it if you forget
            your password; we don’t send reset emails.
          </p>
          <label htmlFor="saved-recovery">Recovery code</label>
          <input
            id="saved-recovery"
            className="recovery-code"
            readOnly
            value={savedCode}
            onFocus={(event) => event.currentTarget.select()}
          />
          <label className="account-check">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />{" "}
            I saved my recovery code
          </label>
        </>
      ) : (
        <>
          <div className="account-tabs" aria-label="Account options">
            <button
              type="button"
              className={mode === "login" ? "selected" : ""}
              onClick={() => change("login")}
              disabled={busy}
              aria-pressed={mode === "login"}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "register" ? "selected" : ""}
              onClick={() => change("register")}
              disabled={busy}
              aria-pressed={mode === "register"}
            >
              Create account
            </button>
          </div>
          {mode === "recover" && (
            <p>Enter your email, saved recovery code and a new password.</p>
          )}
          {mode === "register" && (
            <>
              <label htmlFor="account-name">Your name</label>
              <input
                id="account-name"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={32}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </>
          )}
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          {mode === "recover" && (
            <>
              <label htmlFor="account-recovery">Saved recovery code</label>
              <input
                id="account-recovery"
                required
                minLength={43}
                maxLength={43}
                autoComplete="off"
                value={recovery}
                onChange={(event) => setRecovery(event.target.value)}
                disabled={busy}
              />
            </>
          )}
          <label htmlFor="account-password">
            {mode === "recover" ? "New password" : "Password"}
          </label>
          <div className="account-password">
            <input
              id="account-password"
              type={visible ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {mode !== "login" && (
            <small>Use a phrase of at least 12 characters.</small>
          )}
        </>
      )}
      {error && (
        <div className="app-error" role="alert">
          {error}
        </div>
      )}
      {!enabled && (
        <p className="field-note">
          Account storage is unavailable. You can still try the demo below.
        </p>
      )}
      <button
        className="app-button primary wide"
        type="submit"
        disabled={!enabled || busy || (!!savedCode && !acknowledged)}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <ArrowRight size={16} />
        )}{" "}
        {busy
          ? "One moment…"
          : savedCode
            ? "Continue to QuestGo"
            : mode === "register"
              ? "Create my account"
              : mode === "recover"
                ? "Reset password"
                : "Sign in to QuestGo"}
      </button>
      {!savedCode && (
        <button
          className="text-action"
          type="button"
          disabled={busy}
          onClick={() => change(mode === "recover" ? "login" : "recover")}
        >
          {mode === "recover" ? "Back to sign in" : "Forgot your password?"}
        </button>
      )}
      <small className="account-privacy">
        <LockKeyhole size={12} /> Your login stays in a private browser cookie.
      </small>
    </form>
  );
}
