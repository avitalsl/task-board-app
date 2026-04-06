import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Board } from '../domains/board/types';
import type { Task } from '../domains/tasks/types';
import type { Settings } from '../domains/settings/types';
import type { ScoreState } from '../domains/scoring/types';
import type { Period, PeriodHistoryEntry } from '../domains/periods/types';
import type { AvatarState } from '../domains/avatar/types';
import { bootstrapLocalApp, saveAppData } from '../domains/storage/persistence';

export interface UIState {
  activeScreen: 'board' | 'backlog' | 'settings';
}

export interface StoreState {
  // Domain slices
  // Single-board runtime bridge — temporary until multi-board is introduced.
  board: Board;
  tasks: Task[];
  settings: Settings;
  scoring: ScoreState;
  period: Period | null;
  periodHistory: PeriodHistoryEntry[];
  avatar: AvatarState;
  ui: UIState;

  // Slice setters
  setBoard: (board: Board) => void;
  setTasks: (tasks: Task[]) => void;
  setSettings: (settings: Settings) => void;
  setScoring: (scoring: ScoreState) => void;
  setPeriod: (period: Period | null) => void;
  setPeriodHistory: (history: PeriodHistoryEntry[]) => void;
  setAvatar: (avatar: AvatarState) => void;
  setUI: (ui: Partial<UIState>) => void;
}

function buildInitialState() {
  const data = bootstrapLocalApp();
  return {
    board: data.board,
    tasks: data.tasks,
    settings: data.settings,
    scoring: data.scoring,
    period: data.period,
    periodHistory: data.periodHistory,
    avatar: data.avatar,
    ui: { activeScreen: 'board' as const },
  };
}

export const useStore = create<StoreState>()(
  subscribeWithSelector((set) => ({
    ...buildInitialState(),

    setBoard: (board) => set({ board }),
    setTasks: (tasks) => set({ tasks }),
    setSettings: (settings) => set({ settings }),
    setScoring: (scoring) => set({ scoring }),
    setPeriod: (period) => set({ period }),
    setPeriodHistory: (periodHistory) => set({ periodHistory }),
    setAvatar: (avatar) => set({ avatar }),
    setUI: (ui) => set((state) => ({ ui: { ...state.ui, ...ui } })),
  }))
);

// Persist to local storage on every state change
useStore.subscribe(
  (state) => state,
  (state) => saveAppData({
    board: state.board,
    tasks: state.tasks,
    settings: state.settings,
    scoring: state.scoring,
    period: state.period,
    periodHistory: state.periodHistory,
    avatar: state.avatar,
  })
);
