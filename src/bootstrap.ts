/**
 * Async app bootstrap — resolves access context and syncs with the backend.
 *
 * @temporary This module implements the temporary token-based MVP access model.
 * Future evolution: replace with auth-based session bootstrap.
 *
 * Owner flow (no loading state — localStorage data is shown immediately):
 *   1. Check for existing ownerKey in localStorage.
 *   2. If none: POST /api/owner/init with current local state → save ownerKey.
 *   3. If exists: GET /api/board → apply any task completions made by share recipients.
 *   4. Push merged state to backend.
 *   5. Set up debounced sync subscription (state changes → PUT /api/board).
 *
 * Token-user flow (loading state shown until backend responds):
 *   1. GET /api/shared/:token → populate store.
 *   2. All task completions call POST /api/shared/:token/tasks/:id/complete.
 */

import { shallow } from 'zustand/shallow';
import { useStore } from './store';
import { resolveAccess } from './domains/access/resolveAccess';
import { getOwnerKey, saveOwnerKey } from './domains/storage/persistence';
import {
  initOwner,
  fetchOwnerBoard,
  saveOwnerBoard,
  fetchSharedBoard,
  type BoardStatePayload,
} from './api/boardClient';
import type { Task } from './domains/tasks/types';
import { growthMinutes } from './domains/tasks/types';

// ── Token-user bootstrap ─────────────────────────────────────────────────────

async function bootstrapTokenUser(shareToken: string): Promise<void> {
  try {
    const { boardState } = await fetchSharedBoard(shareToken);
    useStore.getState().setBootstrapped(boardState, 'complete_only_link', { shareToken });
  } catch {
    useStore.getState().setUI({ isBootstrapping: false, bootstrapError: 'Share link is invalid or has expired.' });
  }
}

// ── Owner bootstrap ──────────────────────────────────────────────────────────

function snapshotCurrentState(): BoardStatePayload {
  const s = useStore.getState();
  return {
    board: s.board,
    tasks: s.tasks,
    settings: s.settings,
    scoring: s.scoring,
    period: s.period,
    periodHistory: s.periodHistory,
    avatar: s.avatar,
  };
}

/**
 * Applies task completions from the backend that aren't yet reflected locally.
 * This reconciles the owner's view with any tasks the share recipient completed.
 */
function applyRemoteCompletions(remoteTasks: Task[]): void {
  const state = useStore.getState();
  const remoteMap = new Map(remoteTasks.map((t) => [t.id, t]));

  const newlyCompleted: Task[] = [];
  const mergedTasks = state.tasks.map((task) => {
    const remote = remoteMap.get(task.id);
    if (remote && !task.isCompleted && remote.isCompleted) {
      newlyCompleted.push(task);
      return {
        ...task,
        isCompleted: true,
        isActive: false,
        completedAt: remote.completedAt,
        updatedAt: remote.updatedAt,
      };
    }
    return task;
  });

  if (newlyCompleted.length === 0) return;

  state.setTasks(mergedTasks);

  const pointsGained = newlyCompleted.reduce((sum, t) => sum + growthMinutes(t), 0);
  const requiredCompleted = newlyCompleted.filter((t) => t.type === 'required').length;
  const inPeriod = state.settings.mode !== 'no_goal';
  state.setScoring({
    totalScore: state.scoring.totalScore + pointsGained,
    currentPeriodScore: inPeriod ? state.scoring.currentPeriodScore + pointsGained : state.scoring.currentPeriodScore,
    currentPeriodRequiredCompleted: inPeriod
      ? state.scoring.currentPeriodRequiredCompleted + requiredCompleted
      : state.scoring.currentPeriodRequiredCompleted,
  });
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let ownerSyncUnsubscribe: (() => void) | null = null;

function setupOwnerSyncSubscription(ownerKey: string): void {
  ownerSyncUnsubscribe?.();
  ownerSyncUnsubscribe = useStore.subscribe(
    (state) => ({
      board: state.board,
      tasks: state.tasks,
      settings: state.settings,
      scoring: state.scoring,
      period: state.period,
      periodHistory: state.periodHistory,
      avatar: state.avatar,
    }),
    () => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        saveOwnerBoard(ownerKey, snapshotCurrentState()).catch((err) =>
          console.warn('Background board sync failed:', err)
        );
      }, 1500);
    },
    { equalityFn: shallow }
  );
}

async function bootstrapOwner(): Promise<void> {
  const ownerKey = getOwnerKey();
  if (!ownerKey) {
    // No owner key yet — landing screen will drive the next step
    // (createNewBoard or openBoardWithKey).
    return;
  }

  try {
    const { boardState, shareToken } = await fetchOwnerBoard(ownerKey);
    applyRemoteCompletions(boardState.tasks);
    useStore.getState().setUI({ ownerKey, shareToken: shareToken ?? undefined });
    await saveOwnerBoard(ownerKey, snapshotCurrentState());
  } catch {
    // Backend unreachable — continue with localStorage only.
    useStore.getState().setUI({ ownerKey });
  }

  setupOwnerSyncSubscription(ownerKey);
}

// ── Landing-screen actions ───────────────────────────────────────────────────

/**
 * "Create new board" landing action: registers the current local state with
 * the backend and saves the returned ownerKey. Mirrors the original first-run
 * path that used to live in bootstrapOwner.
 */
export async function createNewBoard(): Promise<void> {
  const localState = snapshotCurrentState();
  const { ownerKey: newKey } = await initOwner(undefined, localState);
  saveOwnerKey(newKey);
  useStore.getState().setUI({ ownerKey: newKey, needsLandingChoice: false });
  setupOwnerSyncSubscription(newKey);
}

/**
 * "Open existing board with key" landing action: validates the pasted owner
 * key against the backend, then hydrates the store from the backend state.
 */
export async function openBoardWithKey(
  rawKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = rawKey.trim();
  if (!trimmed) return { ok: false, error: 'Please enter a board key.' };

  let boardState;
  let shareToken: string | null;
  try {
    const result = await fetchOwnerBoard(trimmed);
    boardState = result.boardState;
    shareToken = result.shareToken;
  } catch (err) {
    if (err instanceof TypeError) {
      return { ok: false, error: 'Could not reach server. Check your connection and try again.' };
    }
    return { ok: false, error: 'That board key is not recognized.' };
  }

  saveOwnerKey(trimmed);
  useStore.getState().setBootstrapped(boardState, 'owner', {
    ownerKey: trimmed,
    shareToken: shareToken ?? undefined,
  });
  setupOwnerSyncSubscription(trimmed);
  return { ok: true };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Bootstraps the app after React mounts. Safe to call once.
 *
 * Owner sessions: runs silently in the background (no UI loading state).
 * Token sessions: triggers loading state, then populates the store from backend.
 */
export function bootstrapApp(): void {
  const access = resolveAccess();

  if (access.type === 'complete_only_link') {
    bootstrapTokenUser(access.shareToken!);
    return;
  }

  // Owner: localStorage data is already in the store.
  // Sync with backend in the background — no loading state needed.
  bootstrapOwner().catch((err) => console.warn('Owner bootstrap failed:', err));
}
