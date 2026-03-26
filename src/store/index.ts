import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Task } from '../domains/tasks/types';
import type { Settings } from '../domains/settings/types';
import { DEFAULT_SETTINGS } from '../domains/settings/types';
import type { ScoreState } from '../domains/scoring/types';
import { DEFAULT_SCORE_STATE } from '../domains/scoring/types';
import type { Period, PeriodHistoryEntry } from '../domains/periods/types';
import type { AvatarState } from '../domains/avatar/types';
import { DEFAULT_AVATAR_STATE } from '../domains/avatar/types';
import { LocalStorageAdapter } from '../domains/storage/LocalStorageAdapter';
import type { AppState } from '../domains/storage/types';

const SCHEMA_VERSION = 1;

export interface UIState {
  activeScreen: 'board' | 'backlog' | 'settings';
}

export interface StoreState {
  // Domain slices
  tasks: Task[];
  settings: Settings;
  scoring: ScoreState;
  period: Period | null;
  periodHistory: PeriodHistoryEntry[];
  avatar: AvatarState;
  ui: UIState;

  // Slice setters
  setTasks: (tasks: Task[]) => void;
  setSettings: (settings: Settings) => void;
  setScoring: (scoring: ScoreState) => void;
  setPeriod: (period: Period | null) => void;
  setPeriodHistory: (history: PeriodHistoryEntry[]) => void;
  setAvatar: (avatar: AvatarState) => void;
  setUI: (ui: Partial<UIState>) => void;
}

const storage = new LocalStorageAdapter();

function buildInitialState(): Omit<StoreState, 'setTasks' | 'setSettings' | 'setScoring' | 'setPeriod' | 'setPeriodHistory' | 'setAvatar' | 'setUI'> {
  const saved = storage.load();
  return {
    tasks: saved?.tasks ?? [],
    settings: saved?.settings ?? DEFAULT_SETTINGS,
    scoring: saved?.scoring ?? DEFAULT_SCORE_STATE,
    period: saved?.period ?? null,
    periodHistory: saved?.periodHistory ?? [],
    avatar: saved?.avatar ?? DEFAULT_AVATAR_STATE,
    ui: { activeScreen: 'board' },
  };
}

export const useStore = create<StoreState>()(
  subscribeWithSelector((set) => ({
    ...buildInitialState(),

    setTasks: (tasks) => set({ tasks }),
    setSettings: (settings) => set({ settings }),
    setScoring: (scoring) => set({ scoring }),
    setPeriod: (period) => set({ period }),
    setPeriodHistory: (periodHistory) => set({ periodHistory }),
    setAvatar: (avatar) => set({ avatar }),
    setUI: (ui) => set((state) => ({ ui: { ...state.ui, ...ui } })),
  }))
);

// Persist to localStorage on every state change
useStore.subscribe(
  (state) => state,
  (state) => {
    const appState: AppState = {
      schemaVersion: SCHEMA_VERSION,
      tasks: state.tasks,
      settings: state.settings,
      scoring: state.scoring,
      period: state.period,
      periodHistory: state.periodHistory,
      avatar: state.avatar,
    };
    storage.save(appState);
  }
);
