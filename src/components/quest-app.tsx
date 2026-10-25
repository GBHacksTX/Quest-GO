"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Flame,
  History,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { AppView, Preferences } from "@/lib/model";
import { ProfileForm } from "./profile-form";
import { SessionPanel } from "./session-panel";
import { AchievementGallery } from "./achievement-photos";

type Tab = "home" | "history" | "device" | "preferences";
type Config = { google: boolean; facebook: boolean; demoEnabled: boolean };
export function QuestApp() {
  const epoch = useRef(0);
  const [data, setData] = useState<AppView | null>(null);
  const [config, setConfig] = useState<Config>({
    google: false,
    facebook: false,
    demoEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [code, setCode] = useState("");
  const refresh = useCallback(async () => {
    const started = epoch.current;
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      if (epoch.current !== started) return;
      if (response.status === 401) setData(null);
      else if (response.ok) {
        const result = await response.json();
        if (epoch.current === started) {
          setData(result);
          setConnected(true);
        }
      } else setConnected(false);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void fetch("/api/config")
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => setError("Couldn't load sign-in options. Please refresh."));
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  async function perform(command: Record<string, unknown>) {
    if (busy) return;
    epoch.current++;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        command.action === "retryPhoto"
          ? `/api/quests/${command.sessionId}/photos/validate`
          : command.action === "retryVenue"
            ? "/api/quests/retry"
            : command.action === "demoPhoto"
              ? "/api/demo/photos"
              : "/api/app",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "That action wasn't saved. Please try again.",
        );
      setData(result);
      setConnected(true);
    } catch (caught) {
      if (caught instanceof TypeError) setConnected(false);
      setError(
        caught instanceof TypeError
          ? "Couldn't reach QuestGo. Your choice wasn't confirmed. Reconnect and try again."
          : caught instanceof Error
            ? caught.message
            : "Couldn't save that action. Please try again.",
      );
    } finally {
      epoch.current++;
      setBusy(false);
    }
  }
  async function demo(action: "start" | "logout") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTab("home");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Couldn't open the demo.",
      );
    } finally {
      setBusy(false);
    }
  }
  const available =
    !!data?.user.availableUntil && data.user.availableUntil > Date.now();
  const navigate = (next: Tab) => {
    setTab(next);
    setError("");
  };
  if (loading)
    return (
      <div className="app-loading">
        <Compass className="loading-compass" size={44} />
        <p>Finding your next chapter…</p>
      </div>
    );
  if (!data)
    return (
      <main className="entry-screen">
        <a className="app-logo" href="/">
          <span>✳</span> Quest<i>Go.</i>
        </a>
        <div className="entry-layout">
          <section className="entry-story">
            <span className="section-kicker">
              LESS SCROLLING. MORE STORIES.
            </span>
            <h1>
              Good things
              <br />
              happen <em>nearby.</em>
            </h1>
            <p>
              A chance encounter. A shared yes. A little adventure you wouldn’t
              have had otherwise.
            </p>
            <div className="entry-orbit">
              <div className="orbit-line orbit-outer" />
              <div className="orbit-line orbit-inner" />
              <span className="orbit-person orbit-person-a">You</span>
              <div className="orbit-center">
                <Compass size={75} strokeWidth={0.8} />
              </div>
              <span className="orbit-person orbit-person-b">
                <Leaf size={20} />
              </span>
              <span className="orbit-spark">✧</span>
              <small>YOUR NEXT CHAPTER IS A HELLO AWAY</small>
            </div>
          </section>
          <section className="panel entry-form">
            <span className="entry-flower">✳</span>
            <h2>
              A little closer.
              <br />A little more adventure.
            </h2>
            <p>Sign in to find a shared quest with someone nearby.</p>
            {error && (
              <div role="alert" className="app-error">
                {error}
              </div>
            )}
            {typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).has("error") && (
                <div className="app-error" role="alert">
                  Sign-in didn’t finish. Try again or explore the demo.
                </div>
              )}
            <button
              className="app-button oauth-button"
              disabled={!config.google || busy}
              onClick={() => void signIn("google", { redirectTo: "/explore" })}
            >
              <span className="oauth-letter">G</span> Continue with Google{" "}
              <ChevronRight size={16} />
            </button>
            <button
              className="app-button oauth-button"
              disabled={!config.facebook || busy}
              onClick={() =>
                void signIn("facebook", { redirectTo: "/explore" })
              }
            >
              <span className="oauth-letter facebook-letter">f</span> Continue
              with Facebook <ChevronRight size={16} />
            </button>
            {!config.google && !config.facebook && (
              <small className="field-note">
                Live sign-in isn’t available on this instance yet.
              </small>
            )}
            {config.demoEnabled && (
              <>
                <div className="entry-divider">
                  <span>or take a little look around</span>
                </div>
                <button
                  className="app-button primary wide"
                  disabled={busy}
                  onClick={() => void demo("start")}
                >
                  {busy ? "Opening your demo…" : "Try the full demo"}
                  <ArrowRight size={17} />
                </button>
                <p className="demo-explanation">
                  No account or device needed. Try the whole journey with a
                  sample partner and clearly labeled demo activities.
                </p>
              </>
            )}
            <div className="entry-promise">
              <ShieldCheck size={16} /> You choose when you’re available. Every
              quest needs a shared yes.
            </div>
          </section>
        </div>
        <footer className="entry-footer">
          A little curiosity goes a long way.{" "}
          <span>Made for the world outside your screen.</span>
        </footer>
      </main>
    );
  const session = data.session;
  const isOnboarding = !data.user.onboarded;
  const showSession = tab === "home" && !!session;
  const title = isOnboarding
    ? "Let’s start your story."
    : tab === "history"
      ? "Stories worth keeping."
      : tab === "device"
        ? "Your little connection."
        : tab === "preferences"
          ? "Your kind of adventure."
          : session
            ? session.status === "offer"
              ? "A hello. A possibility."
              : session.status === "active"
                ? "Go make a memory."
                : "Another page in your story."
            : "Make room for a little wonder.";
  return (
    <div className="explore-app">
      <aside className="app-sidebar">
        <a className="app-logo" href="/">
          <span>✳</span> Quest<i>Go.</i>
        </a>
        <div className="sidebar-caption">THE WORLD, A LITTLE CLOSER</div>
        <nav aria-label="Application navigation">
          {(
            [
              { id: "home", label: "Explore", icon: Compass },
              { id: "history", label: "Your stories", icon: History },
              { id: "device", label: "Your device", icon: Radio },
              { id: "preferences", label: "Preferences", icon: Settings2 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-flower">✳</div>
          <p>
            Less scrolling.
            <br />
            <i>More living.</i>
          </p>
          <small>GOOD STORIES START OUTSIDE.</small>
        </div>
        <button
          className="sidebar-logout"
          disabled={busy}
          onClick={() =>
            data.demo
              ? void demo("logout")
              : void signOut({ redirectTo: "/explore" })
          }
        >
          <LogOut size={16} /> {data.demo ? "Leave demo" : "Sign out"}
        </button>
      </aside>
      <div className="app-content">
        <header className="app-topbar">
          <span>
            YOUR EVERYDAY ADVENTURE <span className="topbar-spark">✧</span>
          </span>
          <div>
            <span className="topbar-area">
              <MapPin size={13} />{" "}
              {data.user.preferences.area || "Your neighborhood"}
            </span>
            <details className="account-menu">
              <summary className="avatar small" aria-label="Account menu">
                {data.user.displayName[0].toUpperCase()}
              </summary>
              <div>
                <strong>{data.user.displayName}</strong>
                <button
                  disabled={busy}
                  onClick={() =>
                    data.demo
                      ? void demo("logout")
                      : void signOut({ redirectTo: "/explore" })
                  }
                >
                  <LogOut size={14} /> {data.demo ? "Leave demo" : "Sign out"}
                </button>
              </div>
            </details>
          </div>
        </header>
        {data.demo && (
          <div className="demo-banner">
            <Sparkles size={15} />
            <span>
              <strong>You’re exploring the demo.</strong> Encounters, partner
              actions and venues are samples. Your progress is saved in this
              demo.
            </span>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Start a fresh demo? Your current room will no longer be selected.",
                  )
                )
                  void demo("start");
              }}
            >
              Start fresh <ArrowRight size={13} />
            </button>
          </div>
        )}
        <main className="app-main">
          <div className="app-heading">
            <div>
              <span className="section-kicker">
                {isOnboarding
                  ? "YOUR FIRST CHAPTER"
                  : `A LITTLE CURIOSITY LOOKS GOOD ON YOU, ${data.user.displayName.toUpperCase()}`}
              </span>
              <h1>{title}</h1>
              <p>
                {isOnboarding
                  ? "A few details, one little device, and a world of possibilities."
                  : tab === "home" && !session
                    ? "You don’t need a grand plan. Just a little room for the unexpected."
                    : tab === "history"
                      ? "Small adventures. Real connections. All part of your story."
                      : tab === "device"
                        ? "Link your QuestGo device. Let a real-world hello open the next chapter."
                        : tab === "preferences"
                          ? "A good quest fits your day, your pace, and your pocket."
                          : "One quest. Two people. Something worth stepping outside for."}
              </p>
            </div>
            <span className="heading-illustration" aria-hidden="true">
              ✳
            </span>
          </div>
          {!connected && (
            <div className="connection-banner" role="status">
              <WifiOff size={17} />
              <span>
                Connection interrupted. Showing your last saved state. Actions
                may need a retry.
              </span>
              <button onClick={() => void refresh()}>Reconnect</button>
            </div>
          )}
          {error && (
            <div className="app-error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {busy && (
            <div className="save-status" role="status">
              <LoaderCircle size={14} className="spin" /> Saving your choice…
            </div>
          )}
          {isOnboarding || tab === "preferences" ? (
            <div className="setup-grid">
              <ProfileForm
                key={data.user.id}
                user={data.user}
                demo={data.demo}
                busy={busy}
                save={async (displayName: string, preferences: Preferences) => {
                  await perform({
                    action: "profile",
                    displayName,
                    preferences,
                  });
                  if (!data.user.onboarded) setTab("device");
                }}
              />
              <aside className="setup-note">
                <Leaf size={36} strokeWidth={1.1} />
                <h3>
                  A shared quest,
                  <br />
                  <em>with room for you.</em>
                </h3>
                <p>
                  We work within both people’s time and budget. Your preferences
                  stay yours; your shared activity fits you both.
                </p>
                <div>
                  <Check size={15} /> Your location stays private
                </div>
                <div>
                  <Check size={15} /> You can always pass
                </div>
                <div>
                  <Check size={15} /> No surprise in-app payments
                </div>
              </aside>
            </div>
          ) : showSession ? (
            <SessionPanel
              data={data}
              busy={busy}
              perform={perform}
              onUpdated={(next) => {
                epoch.current++;
                setData(next);
              }}
            />
          ) : tab === "device" ? (
            <div className="setup-grid">
              <section className="panel device-panel">
                <div className="device-illustration">
                  <Radio size={64} strokeWidth={1} />
                  <span className="device-spark">✧</span>
                </div>
                <span className="section-kicker">
                  A SMALL DEVICE. A WORLD OF POSSIBILITIES.
                </span>
                <h2>
                  {data.devices.length
                    ? "You’re connected."
                    : "Link your QuestGo device."}
                </h2>
                <p>
                  {data.devices.length
                    ? "Your device is linked to your account. When you're available, nearby encounters can become shared adventures."
                    : "Enter the private pairing code supplied with your device. You only need to do this once."}
                </p>
                {data.devices.length ? (
                  <>
                    <div className="linked-device">
                      <span className="device-icon">
                        <Radio size={23} />
                      </span>
                      <div>
                        <strong>
                          {data.demo
                            ? "Sample QuestGo device"
                            : "QuestGo ESP32"}
                        </strong>
                        <small title={data.devices[0].id}>
                          {data.devices[0].id.slice(0, 24)}
                          {data.devices[0].id.length > 24 ? "…" : ""}
                        </small>
                      </div>
                      <span className="pill">
                        <Check size={12} /> Linked
                      </span>
                    </div>
                    <p className="field-note">
                      {data.demo
                        ? "Sample hardware signal. No physical device is being detected."
                        : data.devices[0].lastSeen
                          ? `Last device report: ${new Date(data.devices[0].lastSeen).toLocaleString()}. A linked device is not necessarily online.`
                          : "No device report received yet. Check its Wi-Fi connection."}
                    </p>
                    <button
                      className="app-button primary"
                      onClick={() => navigate("home")}
                    >
                      Find your next chapter <ArrowRight size={17} />
                    </button>
                  </>
                ) : (
                  <>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void perform({ action: "claim", code });
                      }}
                    >
                      <label className="field">
                        Private pairing code
                        <input
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          minLength={4}
                          maxLength={200}
                          placeholder="Enter the code from your device"
                          required
                        />
                      </label>
                      <button
                        className="app-button primary wide"
                        disabled={busy}
                      >
                        Connect device <ArrowRight size={17} />
                      </button>
                    </form>
                    {data.demo && (
                      <button
                        className="app-button secondary wide"
                        disabled={busy}
                        onClick={() =>
                          void perform({
                            action: "claim",
                            code: `DEMO-${data.demoRoom}`,
                          })
                        }
                      >
                        <Sparkles size={15} /> Link the sample device
                      </button>
                    )}
                  </>
                )}
              </section>
              <aside className="setup-note">
                <Compass size={40} strokeWidth={1} />
                <h3>
                  A hello in the real world.
                  <br />
                  <em>A possibility here.</em>
                </h3>
                <p>
                  Your device notices another QuestGo device nearby. The app
                  offers a shared activity only when you’ve both chosen to be
                  available.
                </p>
                <p>
                  Linking a device does not make you automatically available.
                </p>
              </aside>
            </div>
          ) : tab === "history" ? (
            <section className="panel history-panel">
              <div className="panel-intro">
                <span className="section-kicker">
                  YOUR ACHIEVEMENTS · MEMORIES YOU MADE TOGETHER
                </span>
                <h2>
                  {data.history.length
                    ? `${data.history.length} ${data.history.length === 1 ? "story" : "stories"}, and counting.`
                    : "Your first story is still unwritten."}
                </h2>
              </div>
              {data.history.length ? (
                data.history.map((entry) => (
                  <details className="history-entry" key={entry.id}>
                    <summary>
                      <span className="history-symbol">
                        <Leaf size={23} />
                      </span>
                      <div>
                        <strong>{entry.quest.title}</strong>
                        <small>
                          {new Date(entry.completedAt!).toLocaleDateString(
                            undefined,
                            { month: "long", day: "numeric" },
                          )}{" "}
                          · With{" "}
                          {
                            entry.people.find(
                              (person) => person.id !== data.user.id,
                            )?.name
                          }
                          {entry.quest.source === "demo" ? " · Demo" : ""}
                        </small>
                      </div>
                      <span className="history-completed">
                        <Check size={13} /> Completed
                      </span>
                      <ChevronRight size={17} />
                    </summary>
                    <p>{entry.quest.description}</p>
                    <p>
                      {entry.quest.minutes} minutes ·{" "}
                      {entry.quest.costEstimate === 0
                        ? "Free"
                        : entry.quest.costEstimate === null
                          ? "Price varies"
                          : `Estimated $${entry.quest.costEstimate} each`}
                    </p>
                    {entry.quest.venue && (
                      <p>
                        <MapPin size={13} /> {entry.quest.venue.name}
                      </p>
                    )}
                    <AchievementGallery session={entry} />
                  </details>
                ))
              ) : (
                <div className="empty-history">
                  <span>✧</span>
                  <p>When you both confirm a quest, it’ll find a home here.</p>
                  <button
                    className="app-button primary"
                    onClick={() => navigate("home")}
                  >
                    Explore a little <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="home-grid">
              <section className="discovery-panel">
                <div className="discovery-top">
                  <span className="section-kicker">
                    THE WORLD IS BETTER, TOGETHER
                  </span>
                  <span
                    className={`availability-pill ${available ? "is-available" : ""}`}
                  >
                    <span />{" "}
                    {available ? "Available for a quest" : "Taking a breather"}
                  </span>
                </div>
                <h2>
                  {available ? (
                    <>
                      Your next story
                      <br />
                      is <em>a hello away.</em>
                    </>
                  ) : (
                    <>
                      A little connection.
                      <br />
                      <em>A new possibility.</em>
                    </>
                  )}
                </h2>
                <p>
                  {available
                    ? "Keep QuestGo open. When another available person’s device crosses paths with yours, a shared quest will appear here."
                    : "Choose when you’re ready to meet someone and do something a little different."}
                </p>
                <div
                  className={`discovery-radar ${available ? "is-available" : ""}`}
                  aria-hidden="true"
                >
                  <div className="radar-ring ring-one" />
                  <div className="radar-ring ring-two" />
                  <div className="radar-ring ring-three" />
                  <div className="radar-axis" />
                  <span className="radar-star radar-star-a">✧</span>
                  <span className="radar-star radar-star-b">✦</span>
                  <span className="radar-center">
                    <Compass size={45} strokeWidth={1} />
                  </span>
                  <span className="radar-you">YOU ARE HERE</span>
                  <span className="radar-leaf">
                    <Leaf size={21} />
                  </span>
                </div>
                <div className="discovery-action">
                  {!data.devices.length ? (
                    <button
                      className="app-button cream"
                      onClick={() => navigate("device")}
                    >
                      Connect your device <ArrowRight size={17} />
                    </button>
                  ) : (
                    <button
                      className={`app-button ${available ? "glass" : "cream"}`}
                      disabled={busy || !connected}
                      onClick={() =>
                        void perform({
                          action: "availability",
                          available: !available,
                        })
                      }
                    >
                      {available
                        ? "Pause availability"
                        : "I’m open to a little adventure"}
                      {available ? (
                        <Unplug size={16} />
                      ) : (
                        <ArrowRight size={17} />
                      )}
                    </button>
                  )}
                  <small>
                    <ShieldCheck size={13} /> Every quest needs a shared yes.
                  </small>
                </div>
                {data.demo && available && (
                  <button
                    className="demo-encounter-button"
                    disabled={busy}
                    onClick={() => void perform({ action: "demoEncounter" })}
                  >
                    <Sparkles size={15} /> Simulate a nearby encounter{" "}
                    <ArrowDownRight size={16} />
                  </button>
                )}
              </section>
              <aside className="home-aside">
                <section className="panel readiness-panel">
                  <span className="section-kicker">A LITTLE CHECK-IN</span>
                  <h3>Ready when you are.</h3>
                  <div className="readiness-row">
                    <span className="ready-check">
                      <Check size={14} />
                    </span>
                    <div>
                      <strong>Your kind of adventure</strong>
                      <small>
                        {data.user.preferences.mode === "work"
                          ? "Work mode"
                          : "Normal mode"}{" "}
                        · {data.user.preferences.minutes} minutes ·{" "}
                        {data.user.preferences.budget === 0
                          ? "Free"
                          : `Up to $${data.user.preferences.budget}`}
                      </small>
                    </div>
                    <button
                      aria-label="Edit preferences"
                      onClick={() => navigate("preferences")}
                    >
                      <Settings2 size={15} />
                    </button>
                  </div>
                  <div className="readiness-row">
                    <span
                      className={
                        data.devices.length ? "ready-check" : "not-ready"
                      }
                    >
                      {data.devices.length ? (
                        <Check size={14} />
                      ) : (
                        <Radio size={14} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {data.devices.length
                          ? "Device linked"
                          : "Connect your device"}
                      </strong>
                      <small>
                        {data.devices.length
                          ? data.demo
                            ? "Sample device · demo only"
                            : "Ready for proximity reports"
                          : "Your bridge to a real-world hello"}
                      </small>
                    </div>
                    <button
                      aria-label="Manage device"
                      onClick={() => navigate("device")}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="readiness-row">
                    <span className={available ? "ready-check" : "not-ready"}>
                      {available ? <Check size={14} /> : <Wifi size={14} />}
                    </span>
                    <div>
                      <strong>
                        {available
                          ? "Open to a hello"
                          : "You’re currently paused"}
                      </strong>
                      <small>
                        {available
                          ? "Keep this website open while waiting"
                          : "Become available when it suits you"}
                      </small>
                    </div>
                  </div>
                </section>
                <section className="panel story-stats">
                  <div>
                    <Flame size={21} strokeWidth={1.6} />
                    <strong>
                      {data.streak}
                      <small>day{data.streak !== 1 ? "s" : ""}</small>
                    </strong>
                    <span>Current streak</span>
                  </div>
                  <div>
                    <Leaf size={21} strokeWidth={1.6} />
                    <strong>
                      {data.completedCount}
                      <small>quest{data.completedCount !== 1 ? "s" : ""}</small>
                    </strong>
                    <span>Memories made</span>
                  </div>
                  <p>
                    A streak grows through shared completions, one UTC day at a
                    time.
                  </p>
                </section>
                <section className="little-reminder">
                  <span>✧</span>
                  <p>
                    “The best part of a place
                    <br />
                    is often <em>who you meet in it.</em>”
                  </p>
                  <small>A LITTLE REMINDER TO LOOK UP.</small>
                </section>
              </aside>
            </div>
          )}
          <footer className="app-footer">
            <span>✳ Small adventures. Real connections.</span>
            <span>
              {data.demo ? "Demo experience" : "Your next story is nearby"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
