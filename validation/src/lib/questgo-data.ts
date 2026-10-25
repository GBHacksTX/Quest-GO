/**
 * Quest ingredients taken from the QuestGo repo (github.com/GBHacksTX/Quest-GO):
 * preference options from src/components/profile-form.tsx, defaults and example
 * quests from src/lib/domain.ts, venue rules from src/lib/venues.ts, and product
 * rules from docs/PRODUCT.md. Safe to import from client and server code.
 */

export const MODES = ["normal", "work"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, { title: string; subtitle: string }> = {
  normal: { title: "A little adventure", subtitle: "Explore, connect, try something new" },
  work: { title: "A workday breather", subtitle: "Short breaks and fresh perspectives" },
};

export const MINUTE_OPTIONS = [15, 30, 60, 120] as const;
export const BUDGET_OPTIONS = [0, 5, 10, 20, 50, 100] as const;
export const INTERESTS = ["Explore", "Coffee", "Food", "Outdoors", "Creative", "Games"] as const;
export type Interest = (typeof INTERESTS)[number];

/** Work mode quests last at most 15 minutes (docs/PRODUCT.md). */
export const WORK_MODE_MAX_MINUTES = 15;

/** Venue types QuestGo looks up nearby (src/lib/venues.ts). Parks are free. */
export const VENUE_TYPES = [
  { id: "park", label: "a public park", free: true },
  { id: "cafe", label: "a café", free: false },
  { id: "restaurant", label: "a casual restaurant", free: false },
  { id: "museum", label: "a museum", free: false },
  { id: "public", label: "a comfortable public place", free: true },
] as const;

/** The example quests shipped in QuestGo, used as style references for Muse. */
export const EXAMPLE_QUESTS = [
  { title: "A little coffee, a good story", idea: "Find a cozy corner together and trade your favorite local discovery over a drink." },
  { title: "A fresh perspective", idea: "Step away from your screens and trade one idea that has been on your mind." },
  { title: "Find a little wonder", idea: "Each notice one small detail you would normally walk past, then share what caught your eye." },
  { title: "A fresh path, a new perspective", idea: "Take a short wander near a local park and share something you notice." },
  { title: "A local spot, a shared story", idea: "Visit a nearby spot together and trade a story you haven’t told yet." },
  { title: "Walk and talk", idea: "Take a 10-minute walk together." },
  { title: "Builder's break", idea: "Take a five-minute work break and discuss one thing you are currently building." },
];

/** Activity ideas per interest, written in the spirit of QuestGo's quests. */
const INTEREST_IDEAS: Record<Interest, string[]> = {
  Explore: [
    "find a spot nearby that neither of you has noticed before",
    "follow a route chosen by flipping a coin at every corner",
    "hunt for the oldest-looking thing on the block",
    "find a mural, sign or doorway with an interesting story",
  ],
  Coffee: [
    "order a drink neither of you has tried before",
    "rate the café's cozy corners and pick the best one",
    "make up a backstory for your drinks",
  ],
  Food: [
    "split a snack you'd never order alone",
    "find the most colorful thing on a menu",
    "build the perfect shared plate for under the budget",
  ],
  Outdoors: [
    "find three different kinds of leaves",
    "spot something that is blue, something round and something tiny",
    "find the best bench with a view",
    "build a small stack of stones or sticks together",
  ],
  Creative: [
    "make a tiny drawing of each other on a napkin or scrap of paper",
    "recreate a famous painting pose in a public place",
    "shape something out of found objects",
    "write a four-line poem about the place you're in",
  ],
  Games: [
    "play a quick round of rock-paper-scissors for every decision",
    "invent a mini game using only things around you",
    "play I-spy until each of you wins once",
    "race to find something starting with each letter of your names",
  ],
};

const WORK_IDEAS = [
  "trade one idea that has been on your mind",
  "discuss one thing you are currently building",
  "share one thing you're curious about",
  "swap your best productivity trick",
  "sketch your current project on a sticky note",
];

const TWISTS = [
  "Include a moment where you both point at the same thing.",
  "One of you secretly picks a colour; the other must find it.",
  "Finish with a high five in the photo.",
  "Choose your direction by spinning a pen.",
  "Each person gets one veto during the quest.",
  "Include something that is the same colour as one of your shirts.",
  "Make it feel like a nature documentary.",
  "The photo must be taken from an unusual angle.",
  "Include a thumbs-up in the final photo.",
];

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

function sample<T>(list: readonly T[], count: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export interface QuestPreferences {
  mode: Mode;
  minutes: number;
  budget: number;
  interests: Interest[];
  area: string;
}

export const DEFAULT_PREFERENCES: QuestPreferences = {
  mode: "normal",
  minutes: 30,
  budget: 10,
  interests: ["Explore", "Coffee"],
  area: "",
};

/** Random preferences, using only the options QuestGo offers. */
export function randomPreferences(area = ""): QuestPreferences {
  const mode = Math.random() < 0.25 ? "work" : "normal";
  return {
    mode,
    minutes: mode === "work" ? 15 : pick(MINUTE_OPTIONS),
    budget: pick(BUDGET_OPTIONS),
    interests: sample(INTERESTS, 1 + Math.floor(Math.random() * 3)),
    area,
  };
}

/** Picks a venue type the way QuestGo does: free budget means free places only. */
export function randomVenue(prefs: QuestPreferences) {
  const allowed = VENUE_TYPES.filter((v) => prefs.budget > 0 || v.free);
  if (prefs.interests.includes("Food") && !prefs.interests.includes("Coffee") && prefs.budget > 0) {
    return Math.random() < 0.6 ? VENUE_TYPES[2] : pick(allowed);
  }
  if (prefs.interests.includes("Outdoors")) return Math.random() < 0.6 ? VENUE_TYPES[0] : pick(allowed);
  return pick(allowed);
}

/** Builds random quest instructions from the preferences and QuestGo's ideas. */
export function randomInstructions(prefs: QuestPreferences): string {
  const venue = randomVenue(prefs);
  const interestIdeas = prefs.interests.flatMap((i) => INTEREST_IDEAS[i]);
  const ideas = prefs.mode === "work" ? sample(WORK_IDEAS, 1).concat(sample(interestIdeas, 1)) : sample(interestIdeas, 2);
  const budget = prefs.budget === 0 ? "keep it completely free" : `spend at most $${prefs.budget} each`;
  return [
    `Meet at ${venue.label}${prefs.area ? ` around ${prefs.area}` : ""}.`,
    `Together, ${ideas.join(", then ")}.`,
    `${budget[0].toUpperCase()}${budget.slice(1)}.`,
    pick(TWISTS),
  ].join(" ");
}

/** A random style reference and twist so Muse never sees the exact same request twice. */
export function randomInspiration() {
  return {
    styleExample: pick(EXAMPLE_QUESTS),
    twist: pick(TWISTS),
    seed: Math.random().toString(36).slice(2, 10),
  };
}
