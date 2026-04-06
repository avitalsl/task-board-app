import type { GoalMode } from '../settings/types';

export interface Period {
  boardId?: string;
  currentPeriodId: string;
  mode: GoalMode;
  start: number;
  end: number;
  lastResetAt: number;
  anchorStartAt: number;
  resetHour: number;
}

export interface PeriodHistoryEntry {
  boardId?: string;
  periodId: string;
  mode: GoalMode;
  start: number;
  end: number;
  score: number;
  requiredCompleted: number;
  goalAchieved: boolean;
  bonusApplied: boolean;
}
