import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../../store';
import { DEFAULT_AVATAR_STATE } from './types';
import { startEngine, stopEngine, moveTo, setAvatarElement } from './engine';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  stopEngine(); // reset module-level animFrameId
  setAvatarElement(null);
  useStore.setState({ avatar: { ...DEFAULT_AVATAR_STATE } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startEngine', () => {
  it('calls requestAnimationFrame once on first start', () => {
    startEngine();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — second call is a no-op', () => {
    startEngine();
    startEngine();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });
});

describe('stopEngine', () => {
  it('calls cancelAnimationFrame when the engine is running', () => {
    startEngine();
    stopEngine();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('is a no-op when the engine is not running', () => {
    stopEngine(); // engine is already stopped (beforeEach called stopEngine)
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('allows the engine to be restarted after stop', () => {
    startEngine();
    stopEngine();
    startEngine();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});

describe('moveTo', () => {
  it('clears selectedTaskId in the store when it is set', () => {
    useStore.setState({ avatar: { position: { x: 0, y: 0 }, selectedTaskId: 'task-1' } });
    moveTo({ x: 50, y: 50 });
    expect(useStore.getState().avatar.selectedTaskId).toBeNull();
  });

  it('leaves selectedTaskId null when it is already null', () => {
    useStore.setState({ avatar: { position: { x: 0, y: 0 }, selectedTaskId: null } });
    moveTo({ x: 50, y: 50 });
    expect(useStore.getState().avatar.selectedTaskId).toBeNull();
  });
});

describe('setAvatarElement', () => {
  it('accepts null without throwing', () => {
    expect(() => setAvatarElement(null)).not.toThrow();
  });

  it('does not modify store state', () => {
    const before = useStore.getState().avatar;
    setAvatarElement(null);
    expect(useStore.getState().avatar).toEqual(before);
  });
});
