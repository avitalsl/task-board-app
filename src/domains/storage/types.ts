import type { Board } from '../board/types';
import type { Task } from '../tasks/types';
import type { Settings } from '../settings/types';
import type { ScoreState } from '../scoring/types';
import type { Period, PeriodHistoryEntry } from '../periods/types';
import type { AvatarState } from '../avatar/types';

export interface AppState {
  schemaVersion: number;
  // Single-board runtime bridge — temporary until multi-board is introduced.
  // Not the final model; will be replaced by real board selection in a future step.
  board?: Board;
  tasks: Task[];
  settings: Settings;
  scoring: ScoreState;
  period: Period | null;
  periodHistory: PeriodHistoryEntry[];
  avatar: AvatarState;
}

export interface StorageAdapter {
  load(): AppState | null;
  save(state: AppState): void;
}
