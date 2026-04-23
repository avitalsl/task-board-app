import { completeTaskByShareToken, getBoardByShareToken } from '../storage/index.js';
import type { HandlerResult } from './types.js';

/** GET /api/shared/:token — read-only view for share-link recipients. ownerKey is never exposed. */
export async function fetchSharedBoard(token: string): Promise<HandlerResult> {
  const row = await getBoardByShareToken(token);
  if (!row) return { status: 404, body: { error: 'Invalid or expired share link' } };
  return { status: 200, body: { boardState: row.state } };
}

/**
 * POST /api/shared/:token/tasks/:taskId/complete
 *
 * The only write operation a share-token recipient is permitted.
 */
export async function completeTaskViaToken(
  token: string,
  taskId: string
): Promise<HandlerResult> {
  const result = await completeTaskByShareToken(token, taskId);
  if (result.ok) return { status: 200, body: { task: result.task } };
  switch (result.error) {
    case 'already_completed':
      return { status: 409, body: { error: 'Task already completed' } };
    case 'task_not_found':
      return { status: 404, body: { error: 'Task not found' } };
    case 'invalid_token':
      return { status: 404, body: { error: 'Invalid or expired share link' } };
  }
}
