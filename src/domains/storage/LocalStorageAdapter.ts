import type { StorageAdapter, AppState } from './types';

const STORAGE_KEY = 'gamified-task-board';
const CURRENT_SCHEMA_VERSION = 1;

export class LocalStorageAdapter implements StorageAdapter {
  load(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return this.migrate(parsed);
      }
      return parsed;
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

  private migrate(state: AppState): AppState {
    let version = state.schemaVersion ?? 0;

    // Migration stubs — add cases as schema evolves:
    // if (version < 2) { state = migrateV1toV2(state); version = 2; }
    // if (version < 3) { state = migrateV2toV3(state); version = 3; }

    if (version < CURRENT_SCHEMA_VERSION) {
      console.warn(`Migrated state from v${version} to v${CURRENT_SCHEMA_VERSION}`);
    }

    return { ...state, schemaVersion: CURRENT_SCHEMA_VERSION };
  }
}
