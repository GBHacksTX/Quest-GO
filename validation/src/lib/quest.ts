import "server-only";
// The application and this standalone lab use Arjit’s same generator and judge.
import { generateQuest as generate, validateQuest as validate } from "../../../../shared/quest-ai";
import { isMockMode } from "./muse";
import type { Quest, QuestPreferences } from "./types";
export { minuteLimit } from "../../../../shared/quest-ai";
export const generateQuest = (instructions: string, prefs: QuestPreferences, avoidTitles: string[] = []) => generate(instructions, prefs, avoidTitles, { demo: isMockMode() });
export const validateQuest = (quest: Quest, image: string) => validate(quest, image, { demo: isMockMode() });
