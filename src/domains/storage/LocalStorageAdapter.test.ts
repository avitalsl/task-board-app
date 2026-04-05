import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { DEFAULT_SETTINGS } from '../settings/types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { DEFAULT_AVATAR_STATE } from '../avatar/types';
import type { AppState } from './types';

const validState: AppState = {
  schemaVersion: 1,
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
    expect(loaded!.schemaVersion).toBe(1);
    expect(loaded!.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates state with a missing schemaVersion to the current version', () => {
    const oldState = { ...validState, schemaVersion: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(1);
  });

  it('migrates state with an old schemaVersion to the current version', () => {
    const oldState = { ...validState, schemaVersion: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
    const adapter = new LocalStorageAdapter();
    const loaded = adapter.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(1);
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
