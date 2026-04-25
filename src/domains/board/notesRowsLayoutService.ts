import { useStore } from '../../store';
import type { Board } from './types';

/**
 * Layout service for the `notes_rows` presentation.
 *
 * Holds the persisted note order and exposes pure helpers for combining it
 * with the live task list. Other presentations will get their own service
 * (e.g. spatial position metadata) and live alongside this one — this file
 * is intentionally scoped to notes_rows only.
 */

function getBoard(): Board {
  return useStore.getState().board;
}

function setBoardLayouts(board: Board, next: Board['layouts']): void {
  useStore.getState().setBoard({ ...board, layouts: next });
}

/** Persisted note order for the current board, or `[]` if none yet. */
export function getNotesOrder(): string[] {
  return getBoard().layouts?.notes_rows?.order ?? [];
}

/** Persist a new note order. Pass the full ordered list of task ids. */
export function setNotesOrder(order: string[]): void {
  const board = getBoard();
  const layouts = board.layouts ?? {};
  setBoardLayouts(board, {
    ...layouts,
    notes_rows: { order },
  });
}

/**
 * Reorder the persisted list so that `activeId` lands at `overId`'s slot.
 * The list is first reconciled with `currentIds` (the ids actually visible
 * right now) so stale entries are dropped and brand-new tasks are appended.
 */
export function moveNoteBefore(
  activeId: string,
  overId: string,
  currentIds: string[]
): void {
  if (activeId === overId) return;
  const reconciled = reconcileOrder(getNotesOrder(), currentIds);
  const fromIdx = reconciled.indexOf(activeId);
  const toIdx = reconciled.indexOf(overId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
  const next = [...reconciled];
  next.splice(fromIdx, 1);
  next.splice(toIdx, 0, activeId);
  setNotesOrder(next);
}

/**
 * Apply a persisted order to a live list of items.
 *
 * - Items whose ids appear in `order` are emitted in that order.
 * - Items not in `order` (newly created tasks) keep their original relative
 *   position and are appended at the end.
 * - Order entries that don't match any current item are dropped silently.
 *
 * Pure function — useful for both render-time projection and tests.
 */
export function applyNotesOrder<T extends { id: string }>(
  items: T[],
  order: string[]
): T[] {
  if (order.length === 0) return items;
  const byId = new Map(items.map((t) => [t.id, t]));
  const out: T[] = [];
  const used = new Set<string>();
  for (const id of order) {
    const item = byId.get(id);
    if (item && !used.has(id)) {
      out.push(item);
      used.add(id);
    }
  }
  for (const item of items) {
    if (!used.has(item.id)) out.push(item);
  }
  return out;
}

/**
 * Reconcile a persisted id list with the currently visible ids: drop stale
 * entries, append unseen ids at the end. Used as the canonical "current
 * ordered ids" before applying a reorder operation.
 */
export function reconcileOrder(order: string[], currentIds: string[]): string[] {
  const present = new Set(currentIds);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) {
    if (present.has(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of currentIds) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
