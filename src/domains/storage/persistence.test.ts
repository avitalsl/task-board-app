import { describe, it, expect, beforeEach } from 'vitest';
import { bootstrapLocalApp, saveAppData } from './persistence';
import { DEFAULT_SETTINGS } from '../settings/types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';
import { DEFAULT_BOARD_ID, DEFAULT_USER_ID } from '../board/constants';

const STORAGE_KEY = 'gamified-task-board';

const baseBoard = {
  id: DEFAULT_BOARD_ID,
  userId: DEFAULT_USER_ID,
  name: 'My Board',
  mode: 'manage' as const,
  createdAt: '2024-01-01',
};

const baseTask = {
  id: 't1',
  title: 'Task',
  points: 5,
  boardId: DEFAULT_BOARD_ID,
  description: '',
  type: 'optional' as const,
  lifecycleType: 'recurring' as const,
  position: null,
  isActive: true,
  isCompleted: false,
  completedAt: null,
  completionCount: 0,
  createdAt: 0,
  updatedAt: 0,
};

const validState = {
  schemaVersion: 2,
  board: baseBoard,
  tasks: [],
  settings: DEFAULT_SETTINGS,
  scoring: DEFAULT_SCORE_STATE,
  period: null,
  periodHistory: [],
  avatar: DEFAULT_AVATAR_STATE,
};

beforeEach(() => {
  localStorage.clear();
});

describe('bootstrapLocalApp', () => {
  describe('first launch — empty localStorage', () => {
    it('returns a complete state with all required fields', () => {
      const state = bootstrapLocalApp();
      expect(state.board).toBeDefined();
      expect(state.tasks).toEqual([]);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
      expect(state.scoring).toEqual(DEFAULT_SCORE_STATE);
      expect(state.period).toBeNull();
      expect(state.periodHistory).toEqual([]);
      expect(state.avatar).toEqual(DEFAULT_AVATAR_STATE);
    });

    it('always provides a board (BootstrappedState guarantee)', () => {
      const state = bootstrapLocalApp();
      expect(state.board).not.toBeNull();
      expect(state.board).not.toBeUndefined();
    });

    it('default board has the expected id and mode', () => {
      const state = bootstrapLocalApp();
      expect(state.board.id).toBe(DEFAULT_BOARD_ID);
      expect(state.board.userId).toBe(DEFAULT_USER_ID);
      expect(state.board.mode).toBe('manage');
    });
  });

  describe('existing valid data — loaded from localStorage', () => {
    it('returns saved tasks when valid state exists', () => {
      const saved = { ...validState, tasks: [{ ...baseTask, title: 'Saved task', points: 10 }] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      const state = bootstrapLocalApp();
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].title).toBe('Saved task');
    });

    it('returns saved settings when valid state exists', () => {
      const saved = { ...validState, settings: { ...DEFAULT_SETTINGS, targetScore: 999 } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      const state = bootstrapLocalApp();
      expect(state.settings.targetScore).toBe(999);
    });
  });

  describe('partial saved state — missing fields get defaults', () => {
    it('provides default avatar when saved state has no avatar field', () => {
      const { avatar: _avatar, ...partial } = validState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partial));

      const state = bootstrapLocalApp();
      expect(state.avatar).toEqual(DEFAULT_AVATAR_STATE);
    });

    it('provides default board when saved state has no board field', () => {
      const { board: _board, ...partial } = validState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partial));

      const state = bootstrapLocalApp();
      expect(state.board.id).toBe(DEFAULT_BOARD_ID);
    });
  });

  describe('idempotence', () => {
    it('calling twice with the same localStorage returns the same result', () => {
      const first = bootstrapLocalApp();
      const second = bootstrapLocalApp();
      expect(second.tasks).toEqual(first.tasks);
      expect(second.settings).toEqual(first.settings);
      expect(second.scoring).toEqual(first.scoring);
    });
  });
});

describe('saveAppData + bootstrapLocalApp roundtrip', () => {
  it('data survives a save and reload', () => {
    const toSave = {
      ...validState,
      tasks: [{ ...baseTask, createdAt: 100, updatedAt: 100 }],
      settings: { ...DEFAULT_SETTINGS, targetScore: 75 },
      scoring: { totalScore: 42, currentPeriodScore: 10, currentPeriodRequiredCompleted: 1 },
    };

    saveAppData(toSave);
    const loaded = bootstrapLocalApp();

    expect(loaded.tasks).toHaveLength(1);
    expect(loaded.tasks[0].title).toBe('Task');
    expect(loaded.settings.targetScore).toBe(75);
    expect(loaded.scoring.totalScore).toBe(42);
  });

  it('schemaVersion is managed internally — callers do not supply it', () => {
    saveAppData(validState);

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.schemaVersion).toBe(2);
  });
});
