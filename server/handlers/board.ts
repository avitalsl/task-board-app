import { getBoardByOwnerKey, renameOwnerKey as renameOwnerKeyInStorage, updateBoardState } from '../storage/index.js';
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

const KEY_MIN = 3;
const KEY_MAX = 128;
// Disallow whitespace and ASCII control chars — would break the Authorization header.
// eslint-disable-next-line no-control-regex
const KEY_INVALID_CHAR_RE = new RegExp('[\\s\\x00-\\x1f\\x7f]');

/** POST /api/board/rename-key — atomically rename the owner key. */
export async function renameOwnerKey(
  ownerKey: string,
  newOwnerKey: unknown
): Promise<HandlerResult> {
  if (typeof newOwnerKey !== 'string') {
    return { status: 400, body: { error: 'Missing newOwnerKey' } };
  }
  const trimmed = newOwnerKey.trim();
  if (trimmed.length < KEY_MIN || trimmed.length > KEY_MAX) {
    return { status: 400, body: { error: `Key must be ${KEY_MIN}–${KEY_MAX} characters.` } };
  }
  if (KEY_INVALID_CHAR_RE.test(trimmed)) {
    return { status: 400, body: { error: 'Key cannot contain whitespace or control characters.' } };
  }
  if (trimmed === ownerKey) {
    return { status: 400, body: { error: 'New key is the same as the current key.' } };
  }

  const result = await renameOwnerKeyInStorage(ownerKey, trimmed);
  if (result.ok) return { status: 200, body: { ownerKey: trimmed } };
  if (result.reason === 'not_found') return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 409, body: { error: 'That key is already taken.' } };
}
