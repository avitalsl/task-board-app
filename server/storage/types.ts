/**
 * Storage-layer types. Mirror the opaque shapes the backend persists.
 *
 * The server does not validate the inner structure of settings/scoring/period/etc.
 * Only the fields inspected by backend logic (task id/isCompleted/isActive/...) are typed.
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

export interface StoredBoardState {
  board: unknown;
  tasks: StoredTask[];
  settings: unknown;
  scoring: unknown;
  period: unknown;
  periodHistory: unknown[];
  avatar: unknown;
}

export interface BoardRow {
  ownerKey: string;
  shareToken: string | null;
  state: StoredBoardState;
}
