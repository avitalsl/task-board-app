/**
 * Backend storage — domain-meaningful operations over the `boards` table.
 *
 * All data is persisted in a single `boards` row per owner:
 *   owner_key TEXT PK | share_token TEXT UNIQUE | state JSONB | timestamps
 *
 * Each function returns plain data (or null) — no HTTP concerns here.
 */

import { sql } from './client.js';
import type { BoardRow, StoredBoardState, StoredTask } from './types.js';

type Row = {
  owner_key: string;
  share_token: string | null;
  state: StoredBoardState;
};

function mapRow(row: Row): BoardRow {
  return { ownerKey: row.owner_key, shareToken: row.share_token, state: row.state };
}

export async function getBoardByOwnerKey(ownerKey: string): Promise<BoardRow | null> {
  const rows = (await sql`
    SELECT owner_key, share_token, state
    FROM boards
    WHERE owner_key = ${ownerKey}
  `) as Row[];
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getBoardByShareToken(token: string): Promise<Pick<BoardRow, 'state'> | null> {
  const rows = (await sql`
    SELECT state
    FROM boards
    WHERE share_token = ${token}
  `) as Pick<Row, 'state'>[];
  return rows[0] ? { state: rows[0].state } : null;
}

export async function createBoard(ownerKey: string, state: StoredBoardState): Promise<void> {
  await sql`
    INSERT INTO boards (owner_key, state)
    VALUES (${ownerKey}, ${JSON.stringify(state)}::jsonb)
  `;
}

/** Returns true iff a row with the given ownerKey existed and was updated. */
export async function updateBoardState(
  ownerKey: string,
  state: StoredBoardState
): Promise<boolean> {
  const rows = (await sql`
    UPDATE boards
    SET state = ${JSON.stringify(state)}::jsonb,
        updated_at = NOW()
    WHERE owner_key = ${ownerKey}
    RETURNING owner_key
  `) as { owner_key: string }[];
  return rows.length > 0;
}

/** Returns true iff a row with the given ownerKey existed and was updated. */
export async function setShareToken(
  ownerKey: string,
  token: string | null
): Promise<boolean> {
  const rows = (await sql`
    UPDATE boards
    SET share_token = ${token},
        updated_at = NOW()
    WHERE owner_key = ${ownerKey}
    RETURNING owner_key
  `) as { owner_key: string }[];
  return rows.length > 0;
}

export type CompletionResult =
  | { ok: true; task: StoredTask }
  | { ok: false; error: 'invalid_token' | 'task_not_found' | 'already_completed' };

/**
 * Completes a task for a share-token recipient via read-modify-write.
 *
 * Last-write-wins under concurrent owner sync. A single-statement JSONB update
 * would be materially more complex; this is intentionally simpler.
 */
export async function completeTaskByShareToken(
  token: string,
  taskId: string
): Promise<CompletionResult> {
  const rows = (await sql`
    SELECT owner_key, state
    FROM boards
    WHERE share_token = ${token}
  `) as Pick<Row, 'owner_key' | 'state'>[];

  const first = rows[0];
  if (!first) return { ok: false, error: 'invalid_token' };
  const { owner_key: ownerKey, state } = first;

  const idx = state.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return { ok: false, error: 'task_not_found' };

  const task = state.tasks[idx]!;
  if (task.isCompleted) return { ok: false, error: 'already_completed' };

  const now = Date.now();
  const updatedTask: StoredTask = {
    ...task,
    isCompleted: true,
    isActive: false,
    completedAt: now,
    updatedAt: now,
  };
  const newTasks = [...state.tasks];
  newTasks[idx] = updatedTask;
  const newState: StoredBoardState = { ...state, tasks: newTasks };

  await updateBoardState(ownerKey, newState);
  return { ok: true, task: updatedTask };
}
