export type Preferences = {
  mode: "normal" | "work";
  minutes: number;
  budget: number;
  interests: string[];
  area: string;
  latitude?: number;
  longitude?: number;
};

export type User = {
  id: string;
  providerKey: string;
  displayName: string;
  onboarded: boolean;
  preferences: Preferences;
  availableUntil?: number;
  dismissedSessionId?: string;
  demoRoom?: string;
};
export type Device = {
  id: string;
  ownerId?: string;
  claimHash: string;
  keyHash: string;
  lastSeen?: number;
};
export type Quest = {
  id: string;
  title: string;
  description: string;
  steps: string[];
  minutes: number;
  costEstimate: number | null;
  mode: "normal" | "work";
  source: "demo" | "osm" | "fallback";
  venue?: { name: string; address: string; url: string; directionsUrl?: string };
  sourceText?: string;
};
export type Encounter = {
  id: string;
  pairKey: string;
  deviceIds: string[];
  userIds: string[];
  detectedAt: number;
};
export type Participant = { userId: string; acceptedAt?: number; completedAt?: number };
export type QuestSession = {
  id: string;
  encounterId: string;
  questId: string;
  status: "offer" | "active" | "completed" | "cancelled" | "expired";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  expiresAt: number;
  reason?: string;
  generationStatus?: "pending" | "complete" | "unavailable";
  generationStartedAt?: number;
  participants: Participant[];
};
export type State = { users: User[]; devices: Device[]; encounters: Encounter[]; quests: Quest[]; sessions: QuestSession[] };
export const emptyState = (): State => ({ users: [], devices: [], encounters: [], quests: [], sessions: [] });
export type SessionView = QuestSession & { quest: Quest; people: { id: string; name: string; accepted: boolean; completed: boolean }[] };
export type AppView = {
  user: User;
  devices: { id: string; lastSeen?: number }[];
  session?: SessionView;
  history: SessionView[];
  streak: number;
  completedCount: number;
  demo: boolean;
  demoRoom?: string;
  partnerName?: string;
};
