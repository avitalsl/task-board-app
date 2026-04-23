import { nanoid } from 'nanoid';
import { setShareToken } from '../storage/index.js';
import type { HandlerResult } from './types.js';

/** POST /api/board/share-token — generates or rotates the share token. */
export async function generateShareToken(ownerKey: string): Promise<HandlerResult> {
  const shareToken = nanoid(12);
  const updated = await setShareToken(ownerKey, shareToken);
  if (!updated) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { shareToken } };
}

/** DELETE /api/board/share-token — revokes any active share token. */
export async function revokeShareToken(ownerKey: string): Promise<HandlerResult> {
  const updated = await setShareToken(ownerKey, null);
  if (!updated) return { status: 403, body: { error: 'Invalid owner key' } };
  return { status: 200, body: { ok: true } };
}
