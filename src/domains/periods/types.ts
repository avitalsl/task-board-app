import type { GoalMode } from '../settings/types';

export interface Period {
  currentPeriodId: string;
  mode: GoalMode;
  start: number;
  end: number;
  lastResetAt: number;
  anchorStartAt: number;
  resetHour: number;
}

export interface PeriodHistoryEntry {
  periodId: string;
  mode: GoalMode;
  start: number;
  end: number;
  score: number;
  requiredCompleted: number;
  goalAchieved: boolean;
  bonusApplied: boolean;
}
