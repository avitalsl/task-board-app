import { describe, it, expect } from 'vitest';
import { createDefaultBoard, DEFAULT_BOARD_ID, DEFAULT_USER_ID } from './constants';

describe('createDefaultBoard', () => {
  it('returns a board with the default id and userId', () => {
    const board = createDefaultBoard();
    expect(board.id).toBe(DEFAULT_BOARD_ID);
    expect(board.userId).toBe(DEFAULT_USER_ID);
  });

  it('defaults presentation to "spatial"', () => {
    const board = createDefaultBoard();
    expect(board.presentation).toBe('spatial');
  });

  it('defaults mode to "manage"', () => {
    expect(createDefaultBoard().mode).toBe('manage');
  });
});
