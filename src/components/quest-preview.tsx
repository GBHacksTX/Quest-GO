"use client";

import { useState } from "react";

export function QuestPreview() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="quest-preview">
      <button className={`quest-card ${revealed ? "is-flipped" : ""}`} onClick={() => setRevealed(!revealed)} aria-expanded={revealed} aria-label={revealed ? "Close sample quest details" : "Reveal sample quest details"}>
        <span className="quest-card-inner">
          <span className="quest-face quest-front" aria-hidden={revealed}>
            <span className="quest-card-top"><span>THE QUEST COLLECTION</span><span>№ 001</span></span>
            <span className="quest-emblem" aria-hidden="true">✳</span>
            <span className="quest-kicker">A MOMENT OF DISCOVERY</span>
            <span className="quest-title">The path<br />less noticed.</span>
            <span className="quest-meta">10 minutes <span>·</span> 2 people <span>·</span> Free</span>
            <span className="quest-reveal">Reveal your quest <span aria-hidden="true">↗</span></span>
          </span>
          <span className="quest-face quest-back" aria-hidden={!revealed}>
            <span className="quest-card-top"><span>SAMPLE QUEST</span><span>✦</span></span>
            <span className="quest-title">Find a little<br />wonder.</span>
            <span className="quest-description">Take a ten-minute walk together. Each find one small thing you’ve never noticed before, then share why it caught your eye.</span>
            <span className="quest-meta">Normal mode · No cost</span>
            <span className="quest-reveal">Back to the cover <span aria-hidden="true">↶</span></span>
          </span>
        </span>
      </button>
      <p className="sample-disclaimer">An example to explore. Live encounters and shared sessions are coming in later steps.</p>
    </div>
  );
}
