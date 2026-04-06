import { LocalStorageAdapter } from './LocalStorageAdapter';
import type { AppState } from './types';
import type { Board } from '../board/types';
import { createDefaultBoard } from '../board/constants';
import { DEFAULT_SETTINGS } from '../settings/types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';

const SCHEMA_VERSION = 2;
const adapter = new LocalStorageAdapter();

/**
 * State returned by bootstrapLocalApp — all entities are guaranteed to be
 * present. Narrows AppState.board from optional to required since bootstrap
 * always provides the default board.
 */
export type BootstrappedState = Omit<AppState, 'board'> & { board: Board };

/**
 * Load persisted app data (running migration if needed) and apply sensible
 * defaults for any missing entity. Idempotent — safe to call on every startup.
 *
 * This is the single bootstrap/init entry point for the local app.
 * It ensures the board, settings, scoring, and avatar always exist.
 */
export function bootstrapLocalApp(): BootstrappedState {
  const saved = adapter.load();
  return {
    schemaVersion: SCHEMA_VERSION,
    board: saved?.board ?? createDefaultBoard(),
    tasks: saved?.tasks ?? [],
    settings: saved?.settings ?? DEFAULT_SETTINGS,
    scoring: saved?.scoring ?? DEFAULT_SCORE_STATE,
    period: saved?.period ?? null,
    periodHistory: saved?.periodHistory ?? [],
    avatar: saved?.avatar ?? DEFAULT_AVATAR_STATE,
  };
}

/**
 * Persist the current app domain slices to local storage.
 * The schema version is managed here — callers do not need to know it.
 */
export function saveAppData(slices: Omit<AppState, 'schemaVersion'>): void {
  adapter.save({ ...slices, schemaVersion: SCHEMA_VERSION });
}
