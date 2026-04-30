import { getBoardByOwnerKey, updateBoardState } from '../storage/index.js';
import type { StoredBoardState, StoredTask } from '../storage/types.js';
import type { HandlerResult } from './types.js';

/** GET /api/board — returns the owner's full state + any active share token. */
export async function getBoard(ownerKey: string): Promise<HandlerResult> {
  const row = await getBoardByOwnerKey(ownerKey);
  if (!row) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { boardState: row.state, shareToken: row.shareToken } };
}

// Protects share-recipient completions from being clobbered by a stale owner PUT.
// Equal timestamps accept incoming so mutations that don't bump updatedAt (e.g. position) still propagate.
function mergeTasksPreservingNewer(
  stored: StoredTask[],
  incoming: StoredTask[]
): StoredTask[] {
  const storedById = new Map(stored.map((t) => [t.id, t]));
  return incoming.map((inc) => {
    const cur = storedById.get(inc.id);
    return cur && cur.updatedAt > inc.updatedAt ? cur : inc;
  });
}

/** PUT /api/board — replaces stored state, merging tasks by updatedAt. */
export async function updateBoard(
  ownerKey: string,
  boardState: StoredBoardState | undefined
): Promise<HandlerResult> {
  if (!boardState) return { status: 400, body: { error: 'Missing boardState' } };
  const current = await getBoardByOwnerKey(ownerKey);
  if (!current) return { status: 403, body: { error: 'Invalid owner key' } };
  const merged: StoredBoardState = {
    ...boardState,
    tasks: mergeTasksPreservingNewer(current.state.tasks, boardState.tasks),
  };
  const updated = await updateBoardState(ownerKey, merged);
  if (!updated) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { ok: true } };
}
