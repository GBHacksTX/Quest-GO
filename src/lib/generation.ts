import type { Preferences, QuestSession, State } from "./model";
import { getUser } from "./domain";
import { transact } from "./store";
import { createNearbyQuest } from "./venues";
export function combinedPreferences(
  state: State,
  session: QuestSession,
): Preferences {
  const people = session.participants.map((person) =>
    getUser(state, person.userId),
  );
  return {
    ...people[0].preferences,
    mode: people.some((person) => person.preferences.mode === "work")
      ? "work"
      : "normal",
    minutes: Math.min(...people.map((person) => person.preferences.minutes)),
    budget: Math.min(...people.map((person) => person.preferences.budget)),
    interests: [
      ...new Set(people.flatMap((person) => person.preferences.interests)),
    ],
  };
}
export async function generateAndSave(
  sessionId: string,
  preferences: Preferences,
) {
  const generated = await createNearbyQuest(preferences);
  await transact(false, (state) => {
    const session = state.sessions.find((entry) => entry.id === sessionId);
    if (
      session?.status === "offer" &&
      !session.participants.some((person) => person.acceptedAt)
    ) {
      const quest = state.quests.find((entry) => entry.id === session.questId)!;
      Object.assign(quest, generated, { id: quest.id });
      session.generationStatus =
        generated.source === "fallback" ? "unavailable" : "complete";
    }
  });
}
