import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Board } from '../domains/board/types';
import type { Task } from '../domains/tasks/types';
import type { Settings } from '../domains/settings/types';
import type { ScoreState } from '../domains/scoring/types';
import type { Period, PeriodHistoryEntry } from '../domains/periods/types';
import type { AvatarState } from '../domains/avatar/types';
import type { AccessType } from '../domains/access/types';
import type { BoardStatePayload } from '../api/boardClient';
import { shallow } from 'zustand/shallow';
import { bootstrapLocalApp, saveAppData } from '../domains/storage/persistence';
import { resolveAccess } from '../domains/access/resolveAccess';

export interface UIState {
  activeScreen: 'board' | 'backlog' | 'settings';
  /**
   * Resolved access type for the current session.
   * @temporary Part of the temporary token-based MVP access model.
   */
  accessType: AccessType;
  /** Only present for 'complete_only_link' sessions. */
  shareToken?: string;
  /** Owner key for API calls. Only present for 'owner' sessions. Runtime only — not persisted to AppState. */
  ownerKey?: string;
  /** True while async bootstrap is in progress (token-user sessions only). */
  isBootstrapping: boolean;
  /** Set if bootstrap fails (e.g. invalid share token). */
  bootstrapError?: string;
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
  /** Populates the store after an async bootstrap (used for token-user sessions). */
  setBootstrapped: (
    boardState: BoardStatePayload,
    accessType: AccessType,
    opts?: { shareToken?: string; ownerKey?: string }
  ) => void;
}

function buildInitialState() {
  const access = resolveAccess();
  // Token users start in loading state — their data comes from the backend, not localStorage.
  // Owner users load from localStorage immediately (no loading state, same as before).
  const isBootstrapping = access.type === 'complete_only_link';
  const data = bootstrapLocalApp();
  return {
    board: data.board,
    tasks: data.tasks,
    settings: data.settings,
    scoring: data.scoring,
    period: data.period,
    periodHistory: data.periodHistory,
    avatar: data.avatar,
    ui: {
      activeScreen: 'board' as const,
      accessType: access.type,
      shareToken: access.shareToken,
      isBootstrapping,
    },
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
    setBootstrapped: (boardState, accessType, opts) =>
      set((state) => ({
        board: boardState.board,
        tasks: boardState.tasks,
        settings: boardState.settings,
        scoring: boardState.scoring,
        period: boardState.period,
        periodHistory: boardState.periodHistory,
        avatar: boardState.avatar,
        ui: {
          ...state.ui,
          accessType,
          shareToken: opts?.shareToken,
          ownerKey: opts?.ownerKey,
          isBootstrapping: false,
          bootstrapError: undefined,
        },
      })),
  }))
);

// Persist to local storage on domain state changes — owner sessions only.
// Token-based sessions do not write to localStorage (they use the backend as their store).
useStore.subscribe(
  (state) => ({
    board: state.board,
    tasks: state.tasks,
    settings: state.settings,
    scoring: state.scoring,
    period: state.period,
    periodHistory: state.periodHistory,
    avatar: state.avatar,
    accessType: state.ui.accessType,
    isBootstrapping: state.ui.isBootstrapping,
  }),
  (slices) => {
    if (slices.accessType !== 'owner' || slices.isBootstrapping) return;
    saveAppData({
      board: slices.board,
      tasks: slices.tasks,
      settings: slices.settings,
      scoring: slices.scoring,
      period: slices.period,
      periodHistory: slices.periodHistory,
      avatar: slices.avatar,
    });
  },
  { equalityFn: shallow }
);
