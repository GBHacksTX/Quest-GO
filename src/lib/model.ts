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
  budgetLimit?: number;
  mode: "normal" | "work";
  source: "demo" | "osm" | "fallback" | "ai";
  venue?: {
    name: string;
    address: string;
    url: string;
    directionsUrl?: string;
  };
  sourceText?: string;
  completionCriteria?: string[];
};
export type Encounter = {
  id: string;
  pairKey: string;
  deviceIds: string[];
  userIds: string[];
  detectedAt: number;
};
export type AchievementPhoto = {
  id: string;
  uploadedAt: number;
  width: number;
  height: number;
  size: number;
  revision?: number;
  validation?: PhotoValidation;
};
export type PhotoValidation = {
  id: string;
  status: "pending" | "approved" | "rejected" | "error";
  provider: "meta" | "demo";
  model: string;
  checkedAt: number;
  confidence?: number;
  reasoning: string;
  criteria: { criterion: string; met: boolean; evidence: string }[];
};
export type Participant = {
  userId: string;
  acceptedAt?: number;
  completedAt?: number;
  photo?: AchievementPhoto;
};
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
export type State = {
  users: User[];
  devices: Device[];
  encounters: Encounter[];
  quests: Quest[];
  sessions: QuestSession[];
};
export const emptyState = (): State => ({
  users: [],
  devices: [],
  encounters: [],
  quests: [],
  sessions: [],
});
export type SessionView = QuestSession & {
  quest: Quest;
  people: {
    id: string;
    name: string;
    accepted: boolean;
    completed: boolean;
    photo?: AchievementPhoto;
  }[];
};
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
  // Two-player mode: the signed-in player and their friend's board status.
  player?: { code: string; name: string };
  friend?: {
    code: string;
    name: string;
    near: boolean;
    since?: number;
    watcherOnline: boolean;
  };
  photoCheck?: "meta" | "simulated";
};
