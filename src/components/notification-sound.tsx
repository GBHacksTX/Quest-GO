"use client";
import { useEffect, useRef, useState } from "react";

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
export function NotificationSound() {
  const audio = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [note, setNote] = useState("");
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
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      if (audio.current.state !== "running") throw new Error("Audio paused");
      chime(audio.current);
      setEnabled(true);
      setNote(
        "Test chime played. Sound is on while this page stays open; re-enable after a reload. Check device volume if you cannot hear it.",
      );
    } catch {
      setNote(
        "Sound could not start. Unmute this tab and try again in a browser that supports audio.",
      );
    }
  }
  async function mute() {
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") await context.close();
    setEnabled(false);
    setNote(
      "In-page sound is off. System notification sounds follow your device settings.",
    );
  }
  return (
    <div className="notification-sound">
      <p>
        Try the chime without a database connection. Closed-tab notification
        sounds follow your browser and device settings.
      </p>
      <div className="notification-sound-actions">
        <button type="button" onClick={() => void testSound()}>
          {enabled ? "Play test sound" : "Enable & test sound"}
        </button>
        {enabled && (
          <button type="button" onClick={() => void mute()}>
            Mute page sound
          </button>
        )}
      </div>
      {note && <p role="status">{note}</p>}
    </div>
  );
}
