import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { createTask, completeTask } from './tasks/service';
import { addPoints } from './scoring/service';
import { initPeriod, checkReset } from './periods/service';
import { changeMode } from '../application/settingsActions';
import { DEFAULT_SETTINGS } from './settings/types';
import { DEFAULT_SCORE_STATE } from './scoring/types';
import { DEFAULT_AVATAR_STATE } from './avatar/types';

function resetStore() {
  useStore.setState({
    tasks: [],
    settings: { ...DEFAULT_SETTINGS, mode: 'daily', resetHour: 22, targetScore: 50, bonusMultiplier: 1.5 },
    scoring: { ...DEFAULT_SCORE_STATE },
    period: null,
    periodHistory: [],
    avatar: { ...DEFAULT_AVATAR_STATE },
    ui: { activeScreen: 'board', accessType: 'owner', isBootstrapping: false, needsLandingChoice: false },
  });
}

describe('Task completion flow', () => {
  beforeEach(resetStore);

  it('completing a task updates scoring and marks task inactive', () => {
    initPeriod('daily');
    const task = createTask({ title: 'Test', baseTimeMinutes: 20, type: 'required', lifecycleType: 'recurring' });
    addPoints(task);
    completeTask(task.id);

    const state = useStore.getState();
    const updated = state.tasks.find((t) => t.id === task.id)!;
    expect(updated.isCompleted).toBe(true);
    expect(updated.isActive).toBe(false);
    expect(updated.completionCount).toBe(1);
    expect(state.scoring.totalScore).toBe(20);
    expect(state.scoring.currentPeriodScore).toBe(20);
    expect(state.scoring.currentPeriodRequiredCompleted).toBe(1);
  });

  it('one-time task stays completed after period reset', () => {
    initPeriod('daily');
    const task = createTask({ title: 'One-time', baseTimeMinutes: 10, type: 'optional', lifecycleType: 'one_time' });
    addPoints(task);
    completeTask(task.id);

    // Force period to expire
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));
    checkReset();

    const updated = useStore.getState().tasks.find((t) => t.id === task.id)!;
    expect(updated.isCompleted).toBe(true);
    expect(updated.isActive).toBe(false);
  });

  it('recurring task reactivates and resets completionCount after period reset', () => {
    initPeriod('daily');
    const task = createTask({ title: 'Recurring', baseTimeMinutes: 15, type: 'required', lifecycleType: 'recurring' });
    addPoints(task);
    completeTask(task.id);

    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));
    checkReset();

    const updated = useStore.getState().tasks.find((t) => t.id === task.id)!;
    expect(updated.isCompleted).toBe(false);
    expect(updated.isActive).toBe(true);
    expect(updated.completionCount).toBe(0);
  });
});

describe('Settings mode change', () => {
  beforeEach(resetStore);

  it('changing mode resets period score but keeps totalScore', () => {
    initPeriod('daily');
    const task = createTask({ title: 'Test', baseTimeMinutes: 30, type: 'optional', lifecycleType: 'recurring' });
    addPoints(task);

    changeMode('weekly');

    const { scoring, period } = useStore.getState();
    expect(scoring.totalScore).toBe(30);
    expect(scoring.currentPeriodScore).toBe(0);
    expect(period).not.toBeNull();
    expect(period!.mode).toBe('weekly');
  });

  it('switching to no_goal clears period', () => {
    initPeriod('daily');
    changeMode('no_goal');
    expect(useStore.getState().period).toBeNull();
  });

  it('completed tasks stay completed across mode change', () => {
    initPeriod('daily');
    const task = createTask({ title: 'Done', baseTimeMinutes: 10, type: 'optional', lifecycleType: 'one_time' });
    completeTask(task.id);

    changeMode('weekly');

    const updated = useStore.getState().tasks.find((t) => t.id === task.id)!;
    expect(updated.isCompleted).toBe(true);
  });
});

describe('Persistence rehydration', () => {
  beforeEach(resetStore);

  it('store state matches after serialize/deserialize cycle', () => {
    initPeriod('daily');
    createTask({ title: 'Persisted', baseTimeMinutes: 25, type: 'required', lifecycleType: 'recurring' });

    const state = useStore.getState();
    const serialized = JSON.stringify({
      schemaVersion: 1,
      tasks: state.tasks,
      settings: state.settings,
      scoring: state.scoring,
      period: state.period,
      periodHistory: state.periodHistory,
      avatar: state.avatar,
    });
    const deserialized = JSON.parse(serialized);

    expect(deserialized.tasks).toHaveLength(1);
    expect(deserialized.tasks[0].title).toBe('Persisted');
    expect(deserialized.period.mode).toBe('daily');
    expect(deserialized.period.start).toBeGreaterThan(0);
    expect(deserialized.period.end).toBeGreaterThan(deserialized.period.start);
  });
});

describe('Missed reset on startup', () => {
  beforeEach(resetStore);

  it('catches up multiple missed daily resets', () => {
    initPeriod('daily');

    // Simulate 3 days missed — set period end to 3 days ago
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    useStore.setState((s) => ({
      period: s.period
        ? {
            ...s.period,
            start: threeDaysAgo - 24 * 60 * 60 * 1000,
            end: threeDaysAgo,
          }
        : null,
    }));

    checkReset();

    const { period, periodHistory } = useStore.getState();
    // Should have created history entries for missed periods
    expect(periodHistory.length).toBeGreaterThanOrEqual(1);
    // Current period should end in the future
    expect(period!.end).toBeGreaterThan(Date.now());
  });
});
