// @vitest-environment node
/**
 * API-level tests for the temporary token-based shared access model.
 *
 * These tests verify that the backend enforces the permission boundary:
 *   - share-token recipients CAN complete tasks
 *   - share-token recipients CANNOT perform any management action
 *
 * Isolation: `server/store.ts` is replaced by a fully in-memory mock (see vi.mock below).
 * No `server/data.json` file is read or written at any point during these tests.
 * The real persisted server store is never touched.
 */

import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';

// ── In-memory mock store ─────────────────────────────────────────────────────
// vi.mock is hoisted to before all imports by Vitest, so the app module
// receives this mock instead of the real store when it is loaded.
// The real store module (and its data.json file) are never executed.

type MockServerData = {
  ownerKey: string;
  shareToken: string | null;
  state: { tasks: unknown[] };
};

const _store: { data: MockServerData | null } = { data: null };

vi.mock('./store.ts', () => ({
  loadData: () => _store.data,
  saveData: (d: MockServerData) => { _store.data = structuredClone(d); },
}));

// Import AFTER the mock is registered
import { app } from './index.ts';

// ── Server lifecycle ─────────────────────────────────────────────────────────

let server: http.Server;
let baseUrl: string;

const OWNER_KEY = 'test-owner-key-abc123';
const SHARE_TOKEN = 'test-share-token-xyz';
const TASK_ID = 'task-abc';

beforeAll(async () => {
  // Seed state: one board with one incomplete task and an active share token
  _store.data = {
    ownerKey: OWNER_KEY,
    shareToken: SHARE_TOKEN,
    state: {
      tasks: [
        {
          id: TASK_ID,
          title: 'Test task',
          points: 10,
          type: 'optional',
          isCompleted: false,
          isActive: true,
          completedAt: null,
          updatedAt: 1000,
        },
      ],
    },
  };

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function post(path: string, opts: { token?: string; ownerKey?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.ownerKey) headers['Authorization'] = `Bearer ${opts.ownerKey}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

function put(path: string, opts: { ownerKey?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.ownerKey) headers['Authorization'] = `Bearer ${opts.ownerKey}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Shared access — token-based permissions', () => {

  it('token user CAN complete a task', async () => {
    const res = await post(`/api/shared/${SHARE_TOKEN}/tasks/${TASK_ID}/complete`);
    const body = await res.json() as { task: { isCompleted: boolean } };

    expect(res.status).toBe(200);
    expect(body.task.isCompleted).toBe(true);
  });

  it('token user CANNOT overwrite board state (covers create / edit / delete / change settings)', async () => {
    // PUT /api/board is the only write path for all management actions.
    // Token users have no ownerKey, so any attempt returns 401.
    const res = await put('/api/board', {
      body: { boardState: { tasks: [], board: null, settings: null, scoring: null, period: null, periodHistory: [], avatar: null } },
    });
    expect(res.status).toBe(401);
  });

  it('token user CANNOT generate a new share token', async () => {
    const res = await post('/api/board/share-token');
    expect(res.status).toBe(401);
  });

  it('wrong share token is rejected', async () => {
    const res = await post('/api/shared/wrong-token/tasks/task-1/complete');
    expect(res.status).toBe(404);
  });

  it('completing a task that is already completed returns 409', async () => {
    // Task was completed by the first test; trying again must be idempotent-safe.
    const res = await post(`/api/shared/${SHARE_TOKEN}/tasks/${TASK_ID}/complete`);
    expect(res.status).toBe(409);
  });

});
