"use client";
import { useCallback, useEffect, useState } from "react";
import { NotificationSound } from "./notification-sound";
import { Bell } from "lucide-react";
import "./notification-settings.css";

type Config = {
  enabled: boolean;
  publicKey?: string;
  subscribed?: boolean;
  workerOnline?: boolean;
  unavailable?: boolean;
};
export function NotificationSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result: Config = await response.json();
      setConfig(result);
      if (result.subscribed && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        setActive(!!(await registration?.pushManager.getSubscription()));
      } else setActive(false);
    } catch {
      setConfig({ enabled: true, unavailable: true });
    }
  }, []);
  useEffect(() => {
    setSupported(
      window.isSecureContext &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function command(body: object) {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(
        result.error || "Notifications could not be saved. Try again.",
      );
    }
  }
  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      // Permission is requested directly from this click, including on iOS.
      if ((await Notification.requestPermission()) !== "granted") {
        setMessage(
          "Notifications are blocked. Allow them in your browser’s site settings, then try again.",
        );
        return;
      }
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const key = config!.publicKey!;
      const raw = atob(
        key
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(Math.ceil(key.length / 4) * 4, "="),
      );
      if (!subscription)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(raw, (character) =>
            character.charCodeAt(0),
          ),
        });
      try {
        await command({
          action: "subscribe",
          subscription: subscription.toJSON(),
        });
      } catch (error) {
        await subscription.unsubscribe();
        throw error;
      }
      setActive(true);
      setMessage(
        "Enabled for this browser. You can close the tab and receive new event alerts.",
      );
      await refresh();
    } catch (error) {
      // Brave (and some Chromium builds) disable the push service by default,
      // which surfaces as an AbortError "Registration failed - push service error".
      const pushServiceOff =
        error instanceof Error &&
        (error.name === "AbortError" || /push service/i.test(error.message));
      setMessage(
        pushServiceOff
          ? "This browser's push service is turned off. In Brave, enable “Use Google services for push messaging” in brave://settings/privacy and restart, or use Chrome or Firefox."
          : error instanceof Error
            ? error.message
            : "Could not enable notifications. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      await command({ action: "unsubscribe" });
      const registration = await navigator.serviceWorker.getRegistration("/");
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      setActive(false);
      setMessage("Notifications are off for this browser.");
      await refresh();
    } catch {
      setMessage("Could not turn off notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!config || !config.enabled) return null;
  return (
    <section
      className="notification-settings"
      aria-label="Board notifications"
    >
      <div>
        <Bell size={22} aria-hidden="true" />
        <h2>Get a popup when your boards meet.</h2>
      </div>
      <p>
        Works even with this tab closed. Board events go to every browser that
        turns this on.
      </p>
      {!supported ? (
        <p>
          Use a browser that supports push over HTTPS or localhost. On iPhone or
          iPad, add QuestGo to your Home Screen, then open it there.
        </p>
      ) : (
        <>
          {config.unavailable ? (
            <p role="status">
              The notification service is unavailable. Checking again shortly.
            </p>
          ) : (
            <>
              <p>
                {config.workerOnline
                  ? "Listening for new device events."
                  : "The event watcher is offline. Alerts will resume when it reconnects."}
              </p>
              <button
                type="button"
                disabled={busy || !config.publicKey}
                onClick={() => void (active ? disable() : enable())}
              >
                {busy
                  ? "Saving…"
                  : active
                    ? "Turn off notifications"
                    : "Enable notifications"}
              </button>
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      <NotificationSound />
    </section>
  );
}
