import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../../store';
import { initPeriod, checkReset } from './service';
import { DEFAULT_SETTINGS } from '../settings/types';
import { changeMode, resetCurrentPeriod } from '../../application/settingsActions';
import type { Task } from '../tasks/types';

beforeEach(() => {
  vi.useRealTimers();
  useStore.setState({
    tasks: [],
    settings: { ...DEFAULT_SETTINGS, mode: 'daily', resetHour: 22, bonusMultiplier: 1.5, targetScore: 50 },
    scoring: { totalScore: 0, currentPeriodScore: 0, currentPeriodRequiredCompleted: 0 },
    period: null,
    periodHistory: [],
  });
});

describe('initPeriod', () => {
  it('creates a period with start and end timestamps for daily mode', () => {
    initPeriod('daily');
    const { period } = useStore.getState();
    expect(period).not.toBeNull();
    expect(period!.mode).toBe('daily');
    expect(period!.start).toBeLessThanOrEqual(Date.now());
    expect(period!.end).toBeGreaterThan(period!.start);
  });

  it('sets period to null for no_goal mode', () => {
    initPeriod('no_goal');
    expect(useStore.getState().period).toBeNull();
  });

  it('creates a period with MAX_SAFE_INTEGER end for unlimited mode', () => {
    initPeriod('unlimited');
    const { period } = useStore.getState();
    expect(period).not.toBeNull();
    expect(period!.mode).toBe('unlimited');
    expect(period!.end).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('end is within 25 hours of start for daily mode', () => {
    initPeriod('daily');
    const { period } = useStore.getState();
    const diff = period!.end - period!.start;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  it('end is within 8 days of start for weekly mode', () => {
    initPeriod('weekly');
    const { period } = useStore.getState();
    const diff = period!.end - period!.start;
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(8 * 24 * 60 * 60 * 1000);
  });

  it('anchorStartAt equals start on first init', () => {
    initPeriod('weekly');
    const { period } = useStore.getState();
    expect(period!.anchorStartAt).toBe(period!.start);
  });
});

describe('checkReset', () => {
  it('does nothing when period has not ended', () => {
    initPeriod('daily');
    const before = useStore.getState().period;
    checkReset();
    expect(useStore.getState().period!.currentPeriodId).toBe(before!.currentPeriodId);
  });

  it('creates a new period when period has ended', () => {
    initPeriod('daily');
    const oldId = useStore.getState().period!.currentPeriodId;

    // Force period to be expired
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));

    checkReset();

    const { period } = useStore.getState();
    expect(period!.currentPeriodId).not.toBe(oldId);
  });

  it('saves a history entry on reset', () => {
    initPeriod('daily');
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
      scoring: { totalScore: 40, currentPeriodScore: 40, currentPeriodRequiredCompleted: 0 },
    }));

    checkReset();

    expect(useStore.getState().periodHistory).toHaveLength(1);
  });

  it('resets period score after reset', () => {
    initPeriod('daily');
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
      scoring: { totalScore: 40, currentPeriodScore: 40, currentPeriodRequiredCompleted: 2 },
    }));

    checkReset();

    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });

  it('applies bonus to totalScore when goal was met', () => {
    initPeriod('daily');
    // Period score meets target (50), bonusMultiplier = 1.5 → bonus = 25
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
      scoring: { totalScore: 50, currentPeriodScore: 50, currentPeriodRequiredCompleted: 0 },
    }));

    checkReset();

    // totalScore should have bonus added: 50 + 25 = 75
    expect(useStore.getState().scoring.totalScore).toBe(75);
  });

  it('does not apply bonus when goal was not met', () => {
    initPeriod('daily');
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
      scoring: { totalScore: 30, currentPeriodScore: 30, currentPeriodRequiredCompleted: 0 },
    }));

    checkReset();

    expect(useStore.getState().scoring.totalScore).toBe(30);
  });

  it('preserves anchorStartAt across weekly resets', () => {
    initPeriod('weekly');
    const anchor = useStore.getState().period!.anchorStartAt;

    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));

    checkReset();

    expect(useStore.getState().period!.anchorStartAt).toBe(anchor);
  });

  it('reactivates recurring tasks on reset', () => {
    useStore.setState({
      tasks: [
        {
          id: '1', title: 'Recurring', description: '', baseTimeMinutes: 10, difficultyMultiplier: 1,
          type: 'optional', lifecycleType: 'recurring',
          position: { x: 0, y: 0 }, isActive: false, isCompleted: true,
          completedAt: Date.now(), completionCount: 1, createdAt: 0, updatedAt: 0,
        },
        {
          id: '2', title: 'One-time', description: '', baseTimeMinutes: 10, difficultyMultiplier: 1,
          type: 'optional', lifecycleType: 'one_time',
          position: { x: 0, y: 0 }, isActive: false, isCompleted: true,
          completedAt: Date.now(), completionCount: 0, createdAt: 0, updatedAt: 0,
        },
      ],
    });

    initPeriod('daily');
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));

    checkReset();

    const tasks = useStore.getState().tasks;
    const recurring = tasks.find((t) => t.id === '1')!;
    const oneTime = tasks.find((t) => t.id === '2')!;

    expect(recurring.isActive).toBe(true);
    expect(recurring.isCompleted).toBe(false);
    expect(oneTime.isCompleted).toBe(true); // one-time stays completed
    expect(oneTime.isActive).toBe(false);
  });

  it('does nothing for unlimited mode even when period end is in the past', () => {
    useStore.setState((s) => ({ settings: { ...s.settings, mode: 'unlimited' } }));
    initPeriod('unlimited');
    const periodId = useStore.getState().period!.currentPeriodId;

    // Force end to the past — checkReset should still not finalize due to early return
    useStore.setState((s) => ({
      period: s.period ? { ...s.period, end: Date.now() - 1000 } : null,
    }));

    checkReset();

    expect(useStore.getState().period!.currentPeriodId).toBe(periodId);
    expect(useStore.getState().periodHistory).toHaveLength(0);
  });
});

describe('resetCurrentPeriod', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      settings: { ...s.settings, mode: 'daily' },
      scoring: { totalScore: 50, currentPeriodScore: 30, currentPeriodRequiredCompleted: 2 },
    }));
    initPeriod('daily');
  });

  it('clears period score and required completed', () => {
    resetCurrentPeriod();
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });

  it('preserves total score', () => {
    resetCurrentPeriod();
    expect(useStore.getState().scoring.totalScore).toBe(50);
  });

  it('starts a new period from now', () => {
    const before = Date.now();
    const oldId = useStore.getState().period!.currentPeriodId;
    resetCurrentPeriod();
    const { period } = useStore.getState();
    expect(period).not.toBeNull();
    expect(period!.currentPeriodId).not.toBe(oldId);
    expect(period!.start).toBeGreaterThanOrEqual(before);
  });

  it('resets recurring tasks', () => {
    const recurring: Task = {
      id: 'r-1',
      title: 'Recurring',
      description: '',
      baseTimeMinutes: 10, difficultyMultiplier: 1,
      type: 'optional',
      lifecycleType: 'recurring',
      position: null,
      isActive: false,
      isCompleted: true,
      completedAt: 1,
      completionCount: 3,
      createdAt: 0,
      updatedAt: 0,
    };
    useStore.setState({ tasks: [recurring] });
    resetCurrentPeriod();
    const task = useStore.getState().tasks[0];
    expect(task.isActive).toBe(true);
    expect(task.isCompleted).toBe(false);
    expect(task.completedAt).toBeNull();
    expect(task.completionCount).toBe(0);
  });

  it('works for unlimited mode', () => {
    useStore.setState((s) => ({
      settings: { ...s.settings, mode: 'unlimited' },
      scoring: { totalScore: 100, currentPeriodScore: 70, currentPeriodRequiredCompleted: 3 },
    }));
    initPeriod('unlimited');
    resetCurrentPeriod();
    const { scoring, period } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
    expect(scoring.totalScore).toBe(100);
    expect(period!.mode).toBe('unlimited');
    expect(period!.end).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('changeMode from unlimited', () => {
  beforeEach(() => {
    useStore.setState((s) => ({
      settings: { ...s.settings, mode: 'unlimited' },
      scoring: { totalScore: 80, currentPeriodScore: 60, currentPeriodRequiredCompleted: 2 },
    }));
    initPeriod('unlimited');
  });

  it('resets period score when switching from unlimited to daily', () => {
    changeMode('daily');
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
    expect(scoring.totalScore).toBe(80); // total is preserved
  });

  it('initializes a timed period when switching from unlimited to daily', () => {
    changeMode('daily');
    const { period } = useStore.getState();
    expect(period).not.toBeNull();
    expect(period!.mode).toBe('daily');
    expect(period!.end).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(period!.end).toBeGreaterThan(Date.now());
  });
});
