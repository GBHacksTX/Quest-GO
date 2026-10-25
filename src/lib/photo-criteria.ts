import type { Quest } from "./model";

// Older offers still show the same explicit requirements before a photo is sent.
export function photoCriteria(
  quest: Pick<Quest, "completionCriteria">,
): string[] {
  return quest.completionCriteria?.length
    ? quest.completionCriteria
    : [
        "Two people’s hands are visible; faces are optional",
        "The shared activity or its result is visible between them",
      ];
}
