/**
 * Server-side board data persistence — JSON file storage.
 *
 * @temporary This module supports the temporary token-based MVP sharing model.
 * Future evolution should replace this with a real database (e.g. Postgres, SQLite)
 * and a proper membership/role-based access model.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

/**
 * Minimal task shape — only the fields the server needs to inspect.
 * Everything else is treated as opaque JSON and passed through unchanged.
 */
export interface StoredTask {
  id: string;
  isCompleted: boolean;
  isActive: boolean;
  completedAt: number | null;
  updatedAt: number;
  points: number;
  type: string;
  [key: string]: unknown;
}

/** Full board state as stored on the server — domain shape matches the frontend AppState. */
export interface StoredBoardState {
  board: unknown;
  tasks: StoredTask[];
  settings: unknown;
  scoring: unknown;
  period: unknown;
  periodHistory: unknown[];
  avatar: unknown;
}

export interface ServerData {
  /** UUID used to authorize owner API requests. Never sent to share-link recipients. */
  ownerKey: string;
  /** Active share token, if any. One token per board for this MVP. */
  shareToken: string | null;
  state: StoredBoardState;
}

let cache: ServerData | null = null;

export function loadData(): ServerData | null {
  if (cache) return cache;
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ServerData;
    return cache;
  } catch {
    return null;
  }
}

export function saveData(data: ServerData): void {
  cache = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save board data:', e);
  }
}
