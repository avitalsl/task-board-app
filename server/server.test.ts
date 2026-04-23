// @vitest-environment node
/**
 * Backend permission-boundary tests.
 *
 * Covers the contract between share-token recipients and owners:
 *   - share-token recipients CAN complete a task
 *   - share-token recipients CANNOT perform any management action
 *
 * Isolation: the storage module is fully mocked (see vi.mock below). No real DB
 * connection is made, and no DATABASE_URL is required to run these tests.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { BoardRow, StoredBoardState, StoredTask } from './storage/types.js';
import type { CompletionResult } from './storage/index.js';

// ── In-memory mock storage ───────────────────────────────────────────────────
// vi.mock is hoisted, so handlers receive this stub instead of the real Neon-backed module.

type MockState = { row: BoardRow | null };
const _store: MockState = { row: null };

vi.mock('./storage/index.js', () => ({
  getBoardByOwnerKey: async (ownerKey: string): Promise<BoardRow | null> =>
    _store.row && _store.row.ownerKey === ownerKey ? structuredClone(_store.row) : null,

  getBoardByShareToken: async (token: string): Promise<{ state: StoredBoardState } | null> =>
    _store.row && _store.row.shareToken === token
      ? { state: structuredClone(_store.row.state) }
      : null,

  createBoard: async (ownerKey: string, state: StoredBoardState): Promise<void> => {
    _store.row = { ownerKey, shareToken: null, state: structuredClone(state) };
  },

  updateBoardState: async (ownerKey: string, state: StoredBoardState): Promise<boolean> => {
    if (_store.row && _store.row.ownerKey === ownerKey) {
      _store.row = { ..._store.row, state: structuredClone(state) };
      return true;
    }
    return false;
  },

  setShareToken: async (ownerKey: string, token: string | null): Promise<boolean> => {
    if (_store.row && _store.row.ownerKey === ownerKey) {
      _store.row = { ..._store.row, shareToken: token };
      return true;
    }
    return false;
  },

  completeTaskByShareToken: async (token: string, taskId: string): Promise<CompletionResult> => {
    if (!_store.row || _store.row.shareToken !== token) {
      return { ok: false, error: 'invalid_token' };
    }
    const state = _store.row.state;
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
    _store.row = { ..._store.row, state: { ...state, tasks: newTasks } };
    return { ok: true, task: updatedTask };
  },
}));

// Import AFTER the mock is registered.
import { updateBoard } from './handlers/board.js';
import { generateShareToken } from './handlers/shareToken.js';
import { completeTaskViaToken } from './handlers/shared.js';

const OWNER_KEY = 'test-owner-key-abc123';
const SHARE_TOKEN = 'test-share-token-xyz';
const TASK_ID = 'task-abc';

function seed(): void {
  _store.row = {
    ownerKey: OWNER_KEY,
    shareToken: SHARE_TOKEN,
    state: {
      board: null,
      settings: null,
      scoring: null,
      period: null,
      periodHistory: [],
      avatar: null,
      tasks: [
        {
          id: TASK_ID,
          isCompleted: false,
          isActive: true,
          completedAt: null,
          updatedAt: 1000,
          points: 10,
          type: 'optional',
        },
      ],
    },
  };
}

beforeEach(() => {
  seed();
});

describe('Shared access — token-based permissions', () => {
  it('token user CAN complete a task', async () => {
    const res = await completeTaskViaToken(SHARE_TOKEN, TASK_ID);
    expect(res.status).toBe(200);
    expect((res.body as { task: StoredTask }).task.isCompleted).toBe(true);
  });

  it('token user CANNOT overwrite board state (owner-key check rejects the call)', async () => {
    // In production, a missing Authorization header is caught by the api/board adapter
    // (→ 401). At the handler level, passing an unknown ownerKey must yield 403 (never 200),
    // which is the substantive permission boundary this test guards.
    const res = await updateBoard('no-such-owner-key', {
      board: null,
      tasks: [],
      settings: null,
      scoring: null,
      period: null,
      periodHistory: [],
      avatar: null,
    });
    expect(res.status).toBe(403);
  });

  it('token user CANNOT generate a new share token (unknown ownerKey rejected)', async () => {
    const res = await generateShareToken('no-such-owner-key');
    expect(res.status).toBe(403);
  });

  it('wrong share token is rejected', async () => {
    const res = await completeTaskViaToken('wrong-token', TASK_ID);
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe('Invalid or expired share link');
  });

  it('completing a task that is already completed returns 409', async () => {
    await completeTaskViaToken(SHARE_TOKEN, TASK_ID);
    const res = await completeTaskViaToken(SHARE_TOKEN, TASK_ID);
    expect(res.status).toBe(409);
  });

  it('completing a nonexistent task returns 404 with "Task not found"', async () => {
    const res = await completeTaskViaToken(SHARE_TOKEN, 'no-such-task');
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe('Task not found');
  });
});
