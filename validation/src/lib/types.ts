import type { Mode, QuestPreferences } from "./questgo-data";

export type { QuestPreferences } from "./questgo-data";

/** Follows QuestGo's Quest shape (src/lib/model.ts), plus photo criteria for validation. */
export interface Quest {
  id: string;
  title: string;
  description: string;
  steps: string[];
  minutes: number;
  /** Estimated spend per person; null when unknown. */
  costEstimate: number | null;
  budgetLimit: number;
  mode: Mode;
  /** The randomized instructions the quest was generated from. */
  instructions: string;
  /** What the photo must show for the quest to count as done. */
  completionCriteria: string[];
}

export interface CriterionResult {
  criterion: string;
  met: boolean;
  evidence: string;
}

export interface ValidationResult {
  completed: boolean;
  /** 0 to 1 */
  confidence: number;
  reasoning: string;
  criteria: CriterionResult[];
}

export interface GenerateRequest {
  instructions: string;
  preferences: QuestPreferences;
  /** Recent quest titles, so Muse avoids repeating them. */
  avoidTitles?: string[];
}
