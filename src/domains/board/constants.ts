import type { Board } from './types';

// Single-board local-first defaults.
// These are a temporary bridge for the single-user/single-board runtime model.
// Will be replaced once multi-board/auth is introduced.
export const DEFAULT_USER_ID = 'local-user';
export const DEFAULT_BOARD_ID = 'default-board';

export function createDefaultBoard(): Board {
  return {
    id: DEFAULT_BOARD_ID,
    userId: DEFAULT_USER_ID,
    name: 'My Board',
    mode: 'manage',
    presentation: 'spatial',
    layouts: {},
    createdAt: new Date().toISOString(),
  };
}
