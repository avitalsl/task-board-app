import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../../store';
import { initPeriod, checkReset } from './service';
import { DEFAULT_SETTINGS } from '../settings/types';

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
          id: '1', title: 'Recurring', description: '', points: 10,
          type: 'optional', lifecycleType: 'recurring',
          position: { x: 0, y: 0 }, isActive: false, isCompleted: true,
          completedAt: Date.now(), createdAt: 0, updatedAt: 0,
        },
        {
          id: '2', title: 'One-time', description: '', points: 10,
          type: 'optional', lifecycleType: 'one_time',
          position: { x: 0, y: 0 }, isActive: false, isCompleted: true,
          completedAt: Date.now(), createdAt: 0, updatedAt: 0,
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
});
