/**
 * Minimal Express server for token-based shared board access.
 *
 * @temporary This server and its token-based access model are a temporary MVP solution.
 * Future evolution should replace this with a proper backend supporting
 * membership-based board access, user accounts, and role management.
 *
 * Authentication model (temporary):
 *   Owner:    Bearer <ownerKey> in the Authorization header (UUID, stored client-side)
 *   Shared:   shareToken in the URL path (token is the credential — no password)
 *
 * Usage (development):
 *   node --experimental-strip-types server/index.ts
 *   (or via: npm run server)
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { loadData, saveData } from './store.ts';
import type { StoredBoardState } from './store.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const FRONTEND_DEV_ORIGIN = 'http://localhost:5173';

const app = express();
app.use(cors({ origin: [FRONTEND_DEV_ORIGIN, /^http:\/\/localhost:\d+$/] }));
app.use(express.json({ limit: '10mb' }));

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getOwnerKey(req: express.Request): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireOwner(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const key = getOwnerKey(req);
  if (!key) { res.status(401).json({ error: 'Missing owner key' }); return; }
  const data = loadData();
  if (!data || data.ownerKey !== key) { res.status(403).json({ error: 'Invalid owner key' }); return; }
  next();
}

// ── POST /api/owner/init ──────────────────────────────────────────────────────
//
// First-time setup or re-auth for the board owner.
//
// Body: { existingOwnerKey?: string, localState?: StoredBoardState }
// - If no board exists yet: create one (with localState if provided), return ownerKey.
// - If board exists and existingOwnerKey matches: return current board state.
// - If board exists and key doesn't match: 403 (board belongs to another owner).

app.post('/api/owner/init', (req: express.Request, res: express.Response): void => {
  const { existingOwnerKey, localState } = req.body as {
    existingOwnerKey?: string;
    localState?: StoredBoardState;
  };

  const data = loadData();

  if (data) {
    if (existingOwnerKey && data.ownerKey === existingOwnerKey) {
      res.json({ ownerKey: data.ownerKey, boardState: data.state });
    } else {
      res.status(403).json({ error: 'Board already initialized. Provide the correct ownerKey.' });
    }
    return;
  }

  // No board yet — create one
  const ownerKey = nanoid(32);
  const initialState: StoredBoardState = localState ?? {
    board: null, tasks: [], settings: null,
    scoring: null, period: null, periodHistory: [], avatar: null,
  };
  saveData({ ownerKey, shareToken: null, state: initialState });
  res.json({ ownerKey, boardState: initialState });
});

// ── GET /api/board ────────────────────────────────────────────────────────────

app.get('/api/board', requireOwner, (_req: express.Request, res: express.Response): void => {
  const data = loadData()!;
  res.json({ boardState: data.state, shareToken: data.shareToken });
});

// ── PUT /api/board ────────────────────────────────────────────────────────────

app.put('/api/board', requireOwner, (req: express.Request, res: express.Response): void => {
  const { boardState } = req.body as { boardState: StoredBoardState };
  if (!boardState) { res.status(400).json({ error: 'Missing boardState' }); return; }
  const data = loadData()!;
  data.state = boardState;
  saveData(data);
  res.json({ ok: true });
});

// ── POST /api/board/share-token ───────────────────────────────────────────────
// Generates (or rotates) the active share token.

app.post('/api/board/share-token', requireOwner, (_req: express.Request, res: express.Response): void => {
  const data = loadData()!;
  data.shareToken = nanoid(12);
  saveData(data);
  res.json({ shareToken: data.shareToken });
});

// ── DELETE /api/board/share-token ─────────────────────────────────────────────
// Revokes the active share token.

app.delete('/api/board/share-token', requireOwner, (_req: express.Request, res: express.Response): void => {
  const data = loadData()!;
  data.shareToken = null;
  saveData(data);
  res.json({ ok: true });
});

// ── GET /api/shared/:token ────────────────────────────────────────────────────
//
// Returns the board state for shared recipients.
// Does NOT expose the ownerKey. Token must match the stored share token.

app.get('/api/shared/:token', (req: express.Request, res: express.Response): void => {
  const { token } = req.params as { token: string };
  const data = loadData();
  if (!data || data.shareToken !== token) {
    res.status(404).json({ error: 'Invalid or expired share link' });
    return;
  }
  res.json({ boardState: data.state });
});

// ── POST /api/shared/:token/tasks/:taskId/complete ────────────────────────────
//
// Marks a task as completed. Only callable with a valid share token.
//
// Backend enforces this — UI-only gating is not sufficient.
// This is the ONLY write operation permitted for share-link recipients.

app.post(
  '/api/shared/:token/tasks/:taskId/complete',
  (req: express.Request, res: express.Response): void => {
    const { token, taskId } = req.params as { token: string; taskId: string };
    const data = loadData();
    if (!data || data.shareToken !== token) {
      res.status(404).json({ error: 'Invalid or expired share link' });
      return;
    }

    const taskIndex = data.state.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) { res.status(404).json({ error: 'Task not found' }); return; }

    const task = data.state.tasks[taskIndex]!;
    if (task.isCompleted) { res.status(409).json({ error: 'Task already completed' }); return; }

    const now = Date.now();
    data.state.tasks[taskIndex] = {
      ...task,
      isCompleted: true,
      isActive: false,
      completedAt: now,
      updatedAt: now,
    };
    saveData(data);

    res.json({ task: data.state.tasks[taskIndex] });
  }
);

// ── Static file serving (production) ─────────────────────────────────────────
// In development, Vite serves the frontend. In production, Express serves it.

const DIST_DIR = path.join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Export the configured app so tests can start it on a controlled port.
export { app };

// Only start listening when the server is run directly, not when imported by tests.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Board server running at http://localhost:${PORT}`);
  });
}
