/**
 * API client for board server communication.
 *
 * @temporary This client exists to support the temporary token-based shared
 * access model. The API contract will evolve when membership-based access is introduced.
 */

import type { Board } from '../domains/board/types.ts';
import type { Task } from '../domains/tasks/types.ts';
import type { Settings } from '../domains/settings/types.ts';
import type { ScoreState } from '../domains/scoring/types.ts';
import type { Period, PeriodHistoryEntry } from '../domains/periods/types.ts';
import type { AvatarState } from '../domains/avatar/types.ts';

const API_BASE = '/api';

/** Board state shape sent to / received from the server. Matches the frontend AppState. */
export interface BoardStatePayload {
  board: Board;
  tasks: Task[];
  settings: Settings;
  scoring: ScoreState;
  period: Period | null;
  periodHistory: PeriodHistoryEntry[];
  avatar: AvatarState;
}

async function apiRequest<T>(
  method: string,
  apiPath: string,
  opts: { ownerKey?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.ownerKey) headers['Authorization'] = `Bearer ${opts.ownerKey}`;
  const res = await fetch(`${API_BASE}${apiPath}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function initOwner(
  existingOwnerKey?: string,
  localState?: BoardStatePayload
): Promise<{ ownerKey: string; boardState: BoardStatePayload }> {
  return apiRequest('POST', '/owner/init', { body: { existingOwnerKey, localState } });
}

export async function fetchOwnerBoard(
  ownerKey: string
): Promise<{ boardState: BoardStatePayload; shareToken: string | null }> {
  return apiRequest('GET', '/board', { ownerKey });
}

export async function saveOwnerBoard(
  ownerKey: string,
  boardState: BoardStatePayload
): Promise<void> {
  await apiRequest('PUT', '/board', { ownerKey, body: { boardState } });
}

export async function generateShareToken(
  ownerKey: string
): Promise<{ shareToken: string }> {
  return apiRequest('POST', '/board/share-token', { ownerKey });
}

export async function revokeShareToken(ownerKey: string): Promise<void> {
  await apiRequest('DELETE', '/board/share-token', { ownerKey });
}

export async function fetchSharedBoard(
  shareToken: string
): Promise<{ boardState: BoardStatePayload }> {
  return apiRequest('GET', `/shared/${encodeURIComponent(shareToken)}`);
}

export async function completeTaskViaToken(
  shareToken: string,
  taskId: string
): Promise<{ task: Task }> {
  return apiRequest(
    'POST',
    `/shared/${encodeURIComponent(shareToken)}/tasks/${encodeURIComponent(taskId)}/complete`
  );
}
