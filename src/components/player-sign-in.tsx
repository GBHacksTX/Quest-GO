"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Radio } from "lucide-react";

type Player = { username: string; name: string };

// Two-player sign-in: the username is the player's ESP board pairing code.
export function PlayerSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [list, setList] = useState<Player[] | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/players", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setList(result.enabled ? result.players : []))
      .catch(() => setList([]));
  }, []);
  async function signIn(name: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", username: name }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Couldn’t sign in. Try again.");
      onSignedIn();
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? "Couldn’t reach QuestGo. Check the connection and try again."
          : caught instanceof Error
            ? caught.message
            : "Couldn’t sign in.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!list?.length) return null;
  return (
    <div className="player-sign-in">
      <span className="section-kicker">WHO’S PLAYING?</span>
      <div className="player-choices">
        {list.map((player) => (
          <button
            key={player.username}
            type="button"
            className="player-choice"
            disabled={busy}
            onClick={() => void signIn(player.username)}
          >
            <span className="avatar">{player.name[0].toUpperCase()}</span>
            <span>
              <strong>{player.name}</strong>
              <small>
                <Radio size={11} /> {player.username}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void signIn(username);
        }}
      >
        <label className="field">
          Username (your board’s pairing code)
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            minLength={3}
            maxLength={40}
            placeholder="e.g. prabesh"
            required
          />
        </label>
        <button className="app-button primary wide" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={17} />
        </button>
      </form>
      {error && (
        <div role="alert" className="app-error">
          {error}
        </div>
      )}
    </div>
  );
}
