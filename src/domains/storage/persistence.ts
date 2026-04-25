import { LocalStorageAdapter } from './LocalStorageAdapter';

const OWNER_KEY_STORAGE = 'gamified-task-board-owner-key';

/**
 * Temporary MVP owner-identity bridge.
 *
 * The ownerKey is a random UUID generated on first backend init and stored
 * in localStorage. It acts as a low-friction stand-in for real authentication:
 * sent as a bearer token to prove ownership of the board.
 *
 * This is NOT real auth — it offers no protection if localStorage is read.
 * Expected to be replaced by a proper auth-based ownership model in a future phase.
 */
export function getOwnerKey(): string | null {
  return localStorage.getItem(OWNER_KEY_STORAGE);
}

export function saveOwnerKey(key: string): void {
  localStorage.setItem(OWNER_KEY_STORAGE, key);
}
import type { AppState } from './types';
import type { Board } from '../board/types';
import { createDefaultBoard } from '../board/constants';
import { DEFAULT_SETTINGS } from '../settings/types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';

const SCHEMA_VERSION = 5;
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
