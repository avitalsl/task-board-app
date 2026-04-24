import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';
import { isAvatarNearTask, clearSelection } from './boardLogicService';
import { handleTaskComplete } from '../../application/taskActions';
import type { Task } from '../tasks/types';
import type { Settings } from '../settings/types';

// computeNodeRadius(1) === 28, PROXIMITY_RADIUS === 20 → threshold = 48
const TASK_RADIUS_1PT = 28;
const PROXIMITY = 20;
const NEAR_THRESHOLD = TASK_RADIUS_1PT + PROXIMITY; // 48

const baseTask: Task = {
  id: 'task-1',
  title: 'Test',
  description: '',
  baseTimeMinutes: 1,
  difficultyMultiplier: 1,
  type: 'optional',
  lifecycleType: 'recurring',
  position: { x: 100, y: 100 },
  isActive: true,
  isCompleted: false,
  completedAt: null,
  completionCount: 0,
  createdAt: 0,
  updatedAt: 0,
};

const baseSettings: Settings = {
  mode: 'daily',
  targetScore: 50,
  targetRequiredTaskCount: 2,
  goalType: 'points',
  bonusMultiplier: 1.5,
  resetHour: 22,
};

beforeEach(() => {
  useStore.setState({
    tasks: [],
    scoring: { totalScore: 0, currentPeriodScore: 0, currentPeriodRequiredCompleted: 0 },
    settings: baseSettings,
    avatar: { position: { x: 0, y: 0 }, selectedTaskId: null, avatarId: 'teal' },
    period: null,
    periodHistory: [],
  });
});

describe('isAvatarNearTask', () => {
  it('returns false when the task has no position', () => {
    useStore.setState({ tasks: [{ ...baseTask, position: null }], avatar: { position: { x: 0, y: 0 }, selectedTaskId: null, avatarId: 'teal' } });
    expect(isAvatarNearTask('task-1')).toBe(false);
  });

  it('returns false for an unknown task id', () => {
    useStore.setState({ tasks: [baseTask], avatar: { position: { x: 100, y: 100 }, selectedTaskId: null, avatarId: 'teal' } });
    expect(isAvatarNearTask('unknown')).toBe(false);
  });

  it('returns true when avatar is exactly at the threshold distance', () => {
    // task at (100, 100); avatar at (100 + NEAR_THRESHOLD, 100) → distance = 48 = threshold
    useStore.setState({
      tasks: [baseTask],
      avatar: { position: { x: 100 + NEAR_THRESHOLD, y: 100 }, selectedTaskId: null, avatarId: 'teal' },
    });
    expect(isAvatarNearTask('task-1')).toBe(true);
  });

  it('returns false when avatar is beyond the threshold distance', () => {
    // task at (100, 100); avatar at (100 + NEAR_THRESHOLD + 1, 100) → distance = 49 > 48
    useStore.setState({
      tasks: [baseTask],
      avatar: { position: { x: 100 + NEAR_THRESHOLD + 1, y: 100 }, selectedTaskId: null, avatarId: 'teal' },
    });
    expect(isAvatarNearTask('task-1')).toBe(false);
  });

  it('returns true when avatar is at the task centre', () => {
    useStore.setState({
      tasks: [baseTask],
      avatar: { position: { x: 100, y: 100 }, selectedTaskId: null, avatarId: 'teal' },
    });
    expect(isAvatarNearTask('task-1')).toBe(true);
  });
});

describe('handleTaskComplete', () => {
  it('marks the task as completed in the store', () => {
    useStore.setState({ tasks: [baseTask] });
    handleTaskComplete('task-1');
    expect(useStore.getState().tasks[0].isCompleted).toBe(true);
  });

  it('adds points to scoring', () => {
    useStore.setState({ tasks: [{ ...baseTask, baseTimeMinutes: 10 }] });
    handleTaskComplete('task-1');
    expect(useStore.getState().scoring.totalScore).toBe(10);
  });

  it('clears selectedTaskId after completion', () => {
    useStore.setState({
      tasks: [baseTask],
      avatar: { position: { x: 0, y: 0 }, selectedTaskId: 'task-1', avatarId: 'teal' },
    });
    handleTaskComplete('task-1');
    expect(useStore.getState().avatar.selectedTaskId).toBeNull();
  });

  it('does nothing when the task is already completed', () => {
    const completed: Task = { ...baseTask, isCompleted: true, isActive: false };
    useStore.setState({ tasks: [completed] });
    handleTaskComplete('task-1');
    // No points added
    expect(useStore.getState().scoring.totalScore).toBe(0);
  });

  it('does nothing for an unknown task id', () => {
    useStore.setState({ tasks: [baseTask] });
    handleTaskComplete('ghost');
    expect(useStore.getState().scoring.totalScore).toBe(0);
    expect(useStore.getState().tasks[0].isCompleted).toBe(false);
  });
});

describe('clearSelection', () => {
  it('sets selectedTaskId to null when it was set', () => {
    useStore.setState({ avatar: { position: { x: 0, y: 0 }, selectedTaskId: 'task-1', avatarId: 'teal' } });
    clearSelection();
    expect(useStore.getState().avatar.selectedTaskId).toBeNull();
  });

  it('is a no-op when selectedTaskId is already null', () => {
    useStore.setState({ avatar: { position: { x: 0, y: 0 }, selectedTaskId: null, avatarId: 'teal' } });
    clearSelection();
    expect(useStore.getState().avatar.selectedTaskId).toBeNull();
  });
});
