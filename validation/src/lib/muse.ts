import "server-only";
export { callMuseJson, MuseError } from "../../../shared/meta-ai";
export type { MuseMessage } from "../../../shared/meta-ai";
// Only the standalone validation lab reads this flag. Live QuestGo ignores it.
export const isMockMode = () => process.env.MUSE_MOCK === "true";
