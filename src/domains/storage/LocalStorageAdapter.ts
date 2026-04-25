import { DEFAULT_BOARD_ID, createDefaultBoard } from '../board/constants';
import type { StorageAdapter, AppState } from './types';
import { AVATARS, DEFAULT_AVATAR_ID } from '../avatar/avatarConfig';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';

const STORAGE_KEY = 'gamified-task-board';
const CURRENT_SCHEMA_VERSION = 5;

export class LocalStorageAdapter implements StorageAdapter {
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return this.normalizeState(this.migrate(parsed));
      }
      return this.normalizeState(parsed);
    } catch {
      return null;
    }
  }

  save(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Silently fail — storage may be full or unavailable
    }
  }

  private normalizeState(state: AppState): AppState {
    const validIds = new Set(AVATARS.map((a) => a.id));
    const avatarId =
      state.avatar?.avatarId && validIds.has(state.avatar.avatarId)
        ? state.avatar.avatarId
        : DEFAULT_AVATAR_ID;
    const avatar = state.avatar
      ? { ...state.avatar, avatarId }
      : { ...DEFAULT_AVATAR_STATE, avatarId };
    const board = state.board
      ? { ...state.board, layouts: state.board.layouts ?? {} }
      : state.board;
    return {
      ...state,
      board,
      avatar,
      tasks: (state.tasks ?? []).map((t: any) => {
        const { points, ...rest } = t;
        return {
          ...rest,
          completionCount: t.completionCount ?? 0,
          baseTimeMinutes:
            typeof t.baseTimeMinutes === 'number' ? t.baseTimeMinutes
            : typeof points === 'number' ? points
            : 15,
          difficultyMultiplier:
            typeof t.difficultyMultiplier === 'number' ? t.difficultyMultiplier : 1,
        };
      }),
    };
  }

  private migrate(state: AppState): AppState {
    let s = state as any;
    const version = s.schemaVersion ?? 0;

    if (version < 2) {
      s = migrateV1toV2(s);
    }

    if (s.schemaVersion < 3) {
      s = migrateV2toV3(s);
    }

    if (s.schemaVersion < 4) {
      s = migrateV3toV4(s);
    }

    if (s.schemaVersion < 5) {
      s = migrateV4toV5(s);
    }

    if (s.schemaVersion < CURRENT_SCHEMA_VERSION) {
      console.warn(`Migrated state from v${version} to v${CURRENT_SCHEMA_VERSION}`);
    }

    return s as AppState;
  }
}

/**
 * v1 → v2: introduce explicit board ownership.
 * Adds `board` to AppState and backfills `boardId` on all owned entities.
 * Existing data is fully preserved — only new fields are added.
 */
function migrateV1toV2(s: any): any {
  return {
    ...s,
    schemaVersion: 2,
    board: s.board ?? createDefaultBoard(),
    tasks: (s.tasks ?? []).map((t: any) => ({ ...t, boardId: t.boardId ?? DEFAULT_BOARD_ID })),
    settings: { ...s.settings, boardId: s.settings?.boardId ?? DEFAULT_BOARD_ID },
    period: s.period ? { ...s.period, boardId: s.period.boardId ?? DEFAULT_BOARD_ID } : null,
    periodHistory: (s.periodHistory ?? []).map((h: any) => ({
      ...h, boardId: h.boardId ?? DEFAULT_BOARD_ID,
    })),
  };
}

/**
 * v2 → v3: introduce per-board presentation choice.
 * Backfills `board.presentation = 'spatial'` when missing.
 * Replaces structurally-invalid `board` values with a valid default to ensure
 * downstream code never receives an unusable board object.
 */
function migrateV2toV3(s: any): any {
  const existing = s.board;
  const isValidBoard =
    existing &&
    typeof existing === 'object' &&
    typeof existing.id === 'string' &&
    typeof existing.userId === 'string' &&
    typeof existing.mode === 'string';

  const board = isValidBoard
    ? { ...existing, presentation: existing.presentation ?? 'spatial' }
    : createDefaultBoard();

  return { ...s, schemaVersion: 3, board };
}

/**
 * v4 → v5: introduce per-presentation layout metadata on the board.
 * Adds `board.layouts = {}` so future presentation layouts (notes_rows order,
 * spatial positions, etc.) have a stable home. No existing layout data is
 * migrated — existing notes_rows users start with an empty order and the
 * renderer falls back to current task[] order until they reorder.
 */
function migrateV4toV5(s: any): any {
  const board = s.board
    ? { ...s.board, layouts: s.board.layouts ?? {} }
    : s.board;
  return { ...s, schemaVersion: 5, board };
}

/**
 * v3 → v4: switch task sizing from raw `points` to `baseTimeMinutes` +
 * `difficultyMultiplier`. Legacy `points` are interpreted as Growth Minutes
 * with a multiplier of 1, so scoring remains identical post-migration.
 * The raw `points` field is dropped.
 */
function migrateV3toV4(s: any): any {
  const tasks = (s.tasks ?? []).map((t: any) => {
    const { points, ...rest } = t;
    return {
      ...rest,
      baseTimeMinutes:
        typeof t.baseTimeMinutes === 'number' ? t.baseTimeMinutes
        : typeof points === 'number' ? points
        : 15,
      difficultyMultiplier:
        typeof t.difficultyMultiplier === 'number' ? t.difficultyMultiplier : 1,
    };
  });
  return { ...s, schemaVersion: 4, tasks };
}
