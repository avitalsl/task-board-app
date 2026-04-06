import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { DEFAULT_SETTINGS } from '../settings/types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';
import { DEFAULT_BOARD_ID } from '../board/constants';
import type { AppState } from './types';

const validState: AppState = {
  schemaVersion: 2,
  tasks: [],
  settings: DEFAULT_SETTINGS,
  scoring: DEFAULT_SCORE_STATE,
  period: null,
  periodHistory: [],
  avatar: DEFAULT_AVATAR_STATE,
};

const STORAGE_KEY = 'gamified-task-board';

beforeEach(() => {
  localStorage.clear();
});

describe('load', () => {
  it('returns null when localStorage is empty', () => {
    const adapter = new LocalStorageAdapter();
    expect(adapter.load()).toBeNull();
  });

  it('returns null when stored value is invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const adapter = new LocalStorageAdapter();
    expect(adapter.load()).toBeNull();
  });

  it('returns the parsed state when valid data is stored', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validState));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(2);
    expect(loaded!.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates state with a missing schemaVersion to the current version', () => {
    const oldState = { ...validState, schemaVersion: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(2);
  });

  it('migrates state with an old schemaVersion to the current version', () => {
    const oldState = { ...validState, schemaVersion: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(2);
  });
});

describe('v1→v2 migration — data correctness', () => {
  it('backfills boardId on tasks that were missing it', () => {
    const v1State = {
      schemaVersion: 1,
      tasks: [
        { id: 't1', title: 'Old task', points: 10, description: '', type: 'optional', lifecycleType: 'recurring', position: null, isActive: true, isCompleted: false, completedAt: null, createdAt: 0, updatedAt: 0 },
      ],
      settings: { ...DEFAULT_SETTINGS },
      scoring: DEFAULT_SCORE_STATE,
      period: null,
      periodHistory: [],
      avatar: DEFAULT_AVATAR_STATE,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded!.tasks[0]).toHaveProperty('boardId', DEFAULT_BOARD_ID);
  });

  it('backfills boardId on settings that were missing it', () => {
    const settingsWithoutBoardId = { ...DEFAULT_SETTINGS };
    delete (settingsWithoutBoardId as any).boardId;
    const v1State = {
      schemaVersion: 1,
      tasks: [],
      settings: settingsWithoutBoardId,
      scoring: DEFAULT_SCORE_STATE,
      period: null,
      periodHistory: [],
      avatar: DEFAULT_AVATAR_STATE,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded!.settings).toHaveProperty('boardId', DEFAULT_BOARD_ID);
  });

  it('adds a default board when v1 state had no board field', () => {
    const v1State = {
      schemaVersion: 1,
      tasks: [],
      settings: DEFAULT_SETTINGS,
      scoring: DEFAULT_SCORE_STATE,
      period: null,
      periodHistory: [],
      avatar: DEFAULT_AVATAR_STATE,
      // board field intentionally absent
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded!.board).toBeDefined();
    expect(loaded!.board!.id).toBe(DEFAULT_BOARD_ID);
  });

  it('backfills boardId on a period that was missing it', () => {
    const v1State = {
      schemaVersion: 1,
      tasks: [],
      settings: DEFAULT_SETTINGS,
      scoring: DEFAULT_SCORE_STATE,
      period: { currentPeriodId: 'p1', mode: 'daily', start: 0, end: 1, lastResetAt: 0, anchorStartAt: 0, resetHour: 22 },
      periodHistory: [],
      avatar: DEFAULT_AVATAR_STATE,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded!.period).toHaveProperty('boardId', DEFAULT_BOARD_ID);
  });

  it('preserves existing task data (title, points) during migration', () => {
    const v1State = {
      schemaVersion: 1,
      tasks: [
        { id: 't1', title: 'Keep my title', points: 42, description: 'keep desc', type: 'required', lifecycleType: 'one_time', position: null, isActive: true, isCompleted: false, completedAt: null, createdAt: 123, updatedAt: 456 },
      ],
      settings: DEFAULT_SETTINGS,
      scoring: DEFAULT_SCORE_STATE,
      period: null,
      periodHistory: [],
      avatar: DEFAULT_AVATAR_STATE,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    const task = loaded!.tasks[0];
    expect(task.title).toBe('Keep my title');
    expect(task.points).toBe(42);
    expect(task.description).toBe('keep desc');
    expect(task.createdAt).toBe(123);
  });
});

describe('save', () => {
  it('persists state to localStorage', () => {
    const adapter = new LocalStorageAdapter();
    adapter.save(validState);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
  });

  it('state survives a save + load roundtrip', () => {
    const adapter = new LocalStorageAdapter();
    adapter.save(validState);
    const loaded = adapter.load();
    expect(loaded).toEqual(validState);
  });

  it('overwrites previously saved state', () => {
    const adapter = new LocalStorageAdapter();
    adapter.save(validState);
    const updated: AppState = { ...validState, tasks: [{ id: 't1', title: 'A', description: '', points: 5, type: 'optional', lifecycleType: 'recurring', position: null, isActive: true, isCompleted: false, completedAt: null, createdAt: 0, updatedAt: 0 }] };
    adapter.save(updated);
    const loaded = adapter.load();
    expect(loaded!.tasks).toHaveLength(1);
  });
});
