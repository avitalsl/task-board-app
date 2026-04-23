import { nanoid } from 'nanoid';
import { createBoard, getBoardByOwnerKey } from '../storage/index.js';
import type { StoredBoardState } from '../storage/types.js';
import type { HandlerResult } from './types.js';

const EMPTY_STATE: StoredBoardState = {
  board: null,
  tasks: [],
  settings: null,
  scoring: null,
  period: null,
  periodHistory: [],
  avatar: null,
};

/**
 * POST /api/owner/init
 *
 * - No existingOwnerKey   → always creates a fresh board and returns a new ownerKey.
 * - existingOwnerKey match → returns the existing board.
 * - existingOwnerKey miss  → creates a new board under that same key (covers the case
 *   where the user has an ownerKey in localStorage but the backend row is missing,
 *   e.g. after a DB reset or first deploy).
 */
export async function ownerInit(input: {
  existingOwnerKey?: string;
  localState?: StoredBoardState;
}): Promise<HandlerResult> {
  const { existingOwnerKey, localState } = input;

  if (existingOwnerKey) {
    const existing = await getBoardByOwnerKey(existingOwnerKey);
    if (existing) {
      return { status: 200, body: { ownerKey: existing.ownerKey, boardState: existing.state } };
    }
    const initialState = localState ?? EMPTY_STATE;
    await createBoard(existingOwnerKey, initialState);
    return { status: 200, body: { ownerKey: existingOwnerKey, boardState: initialState } };
  }

  const ownerKey = nanoid(32);
  const initialState = localState ?? EMPTY_STATE;
  await createBoard(ownerKey, initialState);
  return { status: 200, body: { ownerKey, boardState: initialState } };
}
