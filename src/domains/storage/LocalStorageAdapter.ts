import { DEFAULT_BOARD_ID, createDefaultBoard } from '../board/constants';
import type { StorageAdapter, AppState } from './types';
import { AVATARS, DEFAULT_AVATAR_ID } from '../avatar/avatarConfig';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';

const STORAGE_KEY = 'gamified-task-board';
const CURRENT_SCHEMA_VERSION = 2;

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
    return {
      ...state,
      avatar,
      tasks: (state.tasks ?? []).map((t: any) => ({
        ...t,
        completionCount: t.completionCount ?? 0,
      })),
    };
  }

  private migrate(state: AppState): AppState {
    let s = state as any;
    const version = s.schemaVersion ?? 0;

    if (version < 2) {
      s = migrateV1toV2(s);
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
