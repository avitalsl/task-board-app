import { useStore } from '../store';
import type { Task } from '../domains/tasks/types';
import type { Board } from '../domains/board/types';
import type { Settings } from '../domains/settings/types';
import type { ScoreState } from '../domains/scoring/types';
import type { Period } from '../domains/periods/types';

export interface AppStorePort {
  getTask(id: string): Task | undefined;
  getBoard(): Board;
  getSettings(): Settings;
  getScoring(): ScoreState;
  setBoard(b: Board): void;
  setSettings(s: Settings): void;
  setScoring(s: ScoreState): void;
  setPeriod(p: Period | null): void;
}

// Default implementation — single Zustand bridge for src/application/
export const storePort: AppStorePort = {
  getTask:     (id) => useStore.getState().tasks.find((t) => t.id === id),
  getBoard:    ()   => useStore.getState().board,
  getSettings: ()   => useStore.getState().settings,
  getScoring:  ()   => useStore.getState().scoring,
  setBoard:    (b)  => useStore.getState().setBoard(b),
  setSettings: (s)  => useStore.getState().setSettings(s),
  setScoring:  (s)  => useStore.getState().setScoring(s),
  setPeriod:   (p)  => useStore.getState().setPeriod(p),
};
