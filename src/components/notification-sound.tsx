"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const storageKey = "questgo-page-sound";
// Browsers only let a page start audio after a click, tap or key press on it.
const unlockEvents = ["pointerdown", "keydown", "touchend"] as const;

function chime(context: AudioContext) {
  for (const [offset, frequency] of [
    [0, 660],
    [0.16, 880],
  ]) {
    const start = context.currentTime + offset;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.12, start + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    tone.connect(volume);
    volume.connect(context.destination);
    tone.start(start);
    tone.stop(start + 0.26);
    tone.onended = () => {
      tone.disconnect();
      volume.disconnect();
    };
  }
}
function savedPreference() {
  try {
    return localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}
function savePreference(on: boolean) {
  try {
    localStorage.setItem(storageKey, on ? "on" : "off");
  } catch {
    /* Private mode: the choice lasts for this page only. */
  }
}

// Page sound is on by default. It starts at once where the browser allows
// autoplay for this site, otherwise on the first interaction anywhere.
export function NotificationSound() {
  const audio = useRef<AudioContext | null>(null);
  const [wanted, setWanted] = useState(true);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");

  const unlock = useCallback(async () => {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
    } catch {
      /* Unsupported or blocked; the status text explains what to do. */
    }
    const running = audio.current?.state === "running";
    setReady(running);
    return running;
  }, []);

  useEffect(() => {
    setWanted(savedPreference());
  }, []);

  useEffect(() => {
    if (!wanted) return;
    let active = true;
    const onInteraction = () => {
      void unlock().then((running) => {
        if (running) detach();
      });
    };
    const detach = () => {
      for (const name of unlockEvents)
        window.removeEventListener(name, onInteraction, true);
    };
    for (const name of unlockEvents)
      window.addEventListener(name, onInteraction, true);
    void unlock().then((running) => {
      if (running && active) detach();
    });
    return () => {
      active = false;
      detach();
    };
  }, [wanted, unlock]);

  useEffect(() => {
    const seen = new Set<string>();
    function receive(event: MessageEvent) {
      if (
        event.data?.type !== "questgo-proximity" ||
        document.visibilityState !== "visible"
      )
        return;
      const context = audio.current;
      if (!context || context.state !== "running") return;
      const tag = event.data.tag;
      if (typeof tag !== "string" || seen.has(tag)) return;
      if (seen.size >= 100) seen.clear();
      seen.add(tag);
      chime(context);
    }
    navigator.serviceWorker?.addEventListener?.("message", receive);
    return () => {
      navigator.serviceWorker?.removeEventListener?.("message", receive);
      const context = audio.current;
      audio.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  async function testSound() {
    savePreference(true);
    setWanted(true);
    if (await unlock()) {
      chime(audio.current!);
      setNote("Test chime played. Check device volume if you cannot hear it.");
    } else {
      setNote(
        "Sound could not start. Unmute this tab and try again in a browser that supports audio.",
      );
    }
  }
  async function mute() {
    savePreference(false);
    setWanted(false);
    setReady(false);
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") await context.close();
    setNote(
      "Page sound is off. System notification sounds follow your device settings.",
    );
  }
  const status = !wanted
    ? "Page sound is off."
    : ready
      ? "Page sound is on: new events chime while this tab is visible."
      : "Page sound turns on at your first click or key press on this page (a browser rule). In Brave, allow Autoplay for this site to skip that.";
  return (
    <div className="notification-sound">
      <p>
        {status} Closed-tab notification sounds follow your browser and device
        settings.
      </p>
      <div className="notification-sound-actions">
        <button type="button" onClick={() => void testSound()}>
          {wanted ? "Play test sound" : "Turn on page sound"}
        </button>
        {wanted && (
          <button type="button" onClick={() => void mute()}>
            Mute page sound
          </button>
        )}
      </div>
      {note && <p role="status">{note}</p>}
    </div>
  );
}
