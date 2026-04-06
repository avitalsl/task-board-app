/**
 * Target domain model — Step 2 migration specification.
 *
 * These types define the intended domain entity shapes.
 * The existing implementation types (Task, Settings, Period, etc.)
 * in src/domains/ remain in use until Step 2 migrates them.
 *
 * Each type includes inline comments documenting the gap with the current model.
 */

export type { User } from './user/types';
export type { Board } from './board/types';

// ---------------------------------------------------------------------------
// Task
// Current: src/domains/tasks/types.ts → Task
// ---------------------------------------------------------------------------

export type Task = {
  id: string;
  boardId: string;               // gap: not present on current Task
  title: string;
  description?: string;          // gap: currently non-optional (string)
  points: number;
  required: boolean;             // gap: currently type: 'required' | 'optional'
  recurrenceType: 'one_time' | 'recurring'; // gap: currently lifecycleType: LifecycleType
  status: 'active' | 'completed'; // gap: currently isActive: boolean + isCompleted: boolean
  createdAt: string;             // gap: currently number (Unix ms)
  completedAt?: string;          // gap: currently number | null
  // position: {x,y} | null — kept on the implementation type for board layout
  // updatedAt: number — kept on the implementation type for service tracking
};

// ---------------------------------------------------------------------------
// BoardSettings
// Current: src/domains/settings/types.ts → Settings
// ---------------------------------------------------------------------------

export type BoardSettings = {
  boardId: string;               // gap: not present on current Settings
  goalMode: 'none' | 'daily' | 'weekly'; // gap: currently mode: 'no_goal' | 'daily' | 'weekly'
  resetHour: number;
  bonusMultiplier: number;
  // targetScore, targetRequiredTaskCount, goalType — kept on the implementation
  // type (Settings) because the scoring logic and ProgressBar depend on them
};

// ---------------------------------------------------------------------------
// PeriodState
// Current: split across src/domains/periods/types.ts → Period
//          and src/domains/scoring/types.ts → ScoreState
// ---------------------------------------------------------------------------

export type PeriodState = {
  boardId: string;               // gap: not present on current Period
  currentPeriodId: string | null;
  currentScore: number;          // gap: currently in separate ScoreState.currentPeriodScore
  startedAt?: string;            // gap: currently Period.start: number
  endsAt?: string;               // gap: currently Period.end: number
  // mode, anchorStartAt, lastResetAt, resetHour — kept on the implementation
  // type (Period) because the period reset service depends on them
};

// ---------------------------------------------------------------------------
// PeriodHistoryEntry
// Current: src/domains/periods/types.ts → PeriodHistoryEntry
// ---------------------------------------------------------------------------

export type PeriodHistoryEntry = {
  id: string;                    // gap: currently periodId
  boardId: string;               // gap: not present
  startedAt: string;             // gap: currently start: number
  endedAt: string;               // gap: currently end: number
  score: number;
  goalReached: boolean;          // gap: currently goalAchieved
  // mode, requiredCompleted, bonusApplied — kept on the implementation type
  // because SettingsScreen displays them and the scoring service sets them
};
