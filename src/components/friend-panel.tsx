"use client";
import {
  ArrowRight,
  Compass,
  Leaf,
  Radio,
  Sparkles,
  WifiOff,
} from "lucide-react";
import type { AppView } from "@/lib/model";

// Home screen for the two players: shows whether the friend's board is near
// and lets either of them start a shared quest while it is.
export function FriendPanel({
  data,
  busy,
  connected,
  start,
}: {
  data: AppView;
  busy: boolean;
  connected: boolean;
  start: () => void;
}) {
  const friend = data.friend!;
  const near = friend.near;
  return (
    <section
      className={`discovery-panel friend-panel ${near ? "is-near" : ""}`}
      aria-live="polite"
    >
      <div className="discovery-top">
        <span className="section-kicker">
          YOU AND {friend.name.toUpperCase()}
        </span>
        <span className={`availability-pill ${near ? "is-available" : ""}`}>
          <span />{" "}
          {!friend.watcherOnline
            ? "Board watcher offline"
            : near
              ? `${friend.name} is near`
              : `${friend.name} isn’t nearby`}
        </span>
      </div>
      <h2>
        {near ? (
          <>
            {friend.name} is near you!
            <br />
            <em>Time for a quest.</em>
          </>
        ) : (
          <>
            Waiting for {friend.name}.
            <br />
            <em>Bring your boards together.</em>
          </>
        )}
      </h2>
      <p>
        {!friend.watcherOnline
          ? "QuestGo isn’t receiving board events right now. Start the notification worker (npm run notifications:worker) and keep your ESP boards powered."
          : near
            ? `Your boards found each other${friend.since ? ` at ${new Date(friend.since).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}. Start a quest and ${friend.name} will see the same offer.`
            : `When your ESP board and ${friend.name}’s come close, this page updates and you can start a shared quest.`}
      </p>
      <div
        className={`discovery-radar ${near ? "is-available" : ""}`}
        aria-hidden="true"
      >
        <div className="radar-ring ring-one" />
        <div className="radar-ring ring-two" />
        <div className="radar-ring ring-three" />
        <div className="radar-axis" />
        <span className="radar-star radar-star-a">✧</span>
        <span className="radar-star radar-star-b">✦</span>
        <span className="radar-center">
          {near ? (
            <Sparkles size={45} strokeWidth={1} />
          ) : (
            <Compass size={45} strokeWidth={1} />
          )}
        </span>
        <span className="radar-you">
          {near ? `${friend.name.toUpperCase()} IS HERE` : "YOU ARE HERE"}
        </span>
        <span className="radar-leaf">
          {near ? (
            <Leaf size={21} />
          ) : friend.watcherOnline ? (
            <Radio size={21} />
          ) : (
            <WifiOff size={21} />
          )}
        </span>
      </div>
      <div className="discovery-action">
        <button
          className={`app-button ${near ? "cream" : "glass"}`}
          disabled={busy || !connected || !near}
          onClick={start}
        >
          {near
            ? `Start a quest with ${friend.name}`
            : `Waiting for ${friend.name}…`}
          <ArrowRight size={17} />
        </button>
        <small>
          Both of you accept before the quest begins. It’s always okay to pass.
        </small>
      </div>
    </section>
  );
}
