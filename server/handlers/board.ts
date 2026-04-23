import { getBoardByOwnerKey, updateBoardState } from '../storage/index.js';
import type { StoredBoardState } from '../storage/types.js';
import type { HandlerResult } from './types.js';

/** GET /api/board — returns the owner's full state + any active share token. */
export async function getBoard(ownerKey: string): Promise<HandlerResult> {
  const row = await getBoardByOwnerKey(ownerKey);
  if (!row) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { boardState: row.state, shareToken: row.shareToken } };
}

/** PUT /api/board — replaces the full stored state. */
export async function updateBoard(
  ownerKey: string,
  boardState: StoredBoardState | undefined
): Promise<HandlerResult> {
  if (!boardState) return { status: 400, body: { error: 'Missing boardState' } };
  const updated = await updateBoardState(ownerKey, boardState);
  if (!updated) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { ok: true } };
}
