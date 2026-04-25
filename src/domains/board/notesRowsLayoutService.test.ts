import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';
import {
  applyNotesOrder,
  getNotesOrder,
  moveNoteBefore,
  reconcileOrder,
  setNotesOrder,
} from './notesRowsLayoutService';

interface IdItem { id: string }
const item = (id: string): IdItem => ({ id });

beforeEach(() => {
  // Reset notes layout to a known state.
  const board = useStore.getState().board;
  useStore.getState().setBoard({ ...board, layouts: {} });
});

describe('applyNotesOrder', () => {
  it('falls back to natural order when no order is persisted', () => {
    const items = [item('a'), item('b'), item('c')];
    expect(applyNotesOrder(items, []).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('reorders items per the persisted order', () => {
    const items = [item('a'), item('b'), item('c')];
    expect(applyNotesOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual([
      'c', 'a', 'b',
    ]);
  });

  it('appends new items not present in the persisted order, in their original order', () => {
    const items = [item('a'), item('b'), item('c'), item('d')];
    expect(applyNotesOrder(items, ['c', 'a']).map((i) => i.id)).toEqual([
      'c', 'a', 'b', 'd',
    ]);
  });

  it('drops persisted ids that no longer exist', () => {
    const items = [item('a'), item('b')];
    expect(applyNotesOrder(items, ['ghost', 'b', 'a']).map((i) => i.id)).toEqual([
      'b', 'a',
    ]);
  });
});

describe('reconcileOrder', () => {
  it('removes stale ids and appends unseen ids', () => {
    expect(reconcileOrder(['a', 'gone', 'b'], ['a', 'b', 'c'])).toEqual([
      'a', 'b', 'c',
    ]);
  });
});

describe('moveNoteBefore', () => {
  it('persists a single-step reorder', () => {
    setNotesOrder(['a', 'b', 'c']);
    moveNoteBefore('c', 'a', ['a', 'b', 'c']);
    expect(getNotesOrder()).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when active and over are equal', () => {
    setNotesOrder(['a', 'b', 'c']);
    moveNoteBefore('a', 'a', ['a', 'b', 'c']);
    expect(getNotesOrder()).toEqual(['a', 'b', 'c']);
  });

  it('reconciles against currentIds before moving', () => {
    setNotesOrder(['a', 'gone', 'b']);
    moveNoteBefore('b', 'a', ['a', 'b', 'c']);
    // After reconcile: ['a', 'b', 'c']. Move 'b' before 'a' → ['b', 'a', 'c'].
    expect(getNotesOrder()).toEqual(['b', 'a', 'c']);
  });
});

describe('setNotesOrder + getNotesOrder roundtrip', () => {
  it('stores and reads the order via the board.layouts structure', () => {
    setNotesOrder(['x', 'y']);
    expect(getNotesOrder()).toEqual(['x', 'y']);
    const layouts = useStore.getState().board.layouts;
    expect(layouts?.notes_rows?.order).toEqual(['x', 'y']);
  });
});
