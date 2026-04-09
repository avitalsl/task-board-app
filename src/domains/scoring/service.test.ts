import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';
import { addPoints, evaluateGoal, applyBonus, resetPeriodProgress } from './service';
import type { Task } from '../tasks/types';
import type { Settings } from '../settings/types';
import type { ScoreState } from './types';

const baseTask: Task = {
  id: '1',
  title: 'Test',
  description: '',
  points: 10,
  type: 'optional',
  lifecycleType: 'recurring',
  position: { x: 0, y: 0 },
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
    scoring: { totalScore: 0, currentPeriodScore: 0, currentPeriodRequiredCompleted: 0 },
    settings: baseSettings,
  });
});

describe('addPoints', () => {
  it('increments totalScore and currentPeriodScore in daily mode', () => {
    addPoints(baseTask);
    const { scoring } = useStore.getState();
    expect(scoring.totalScore).toBe(10);
    expect(scoring.currentPeriodScore).toBe(10);
  });

  it('only increments totalScore in no_goal mode', () => {
    useStore.setState({ settings: { ...baseSettings, mode: 'no_goal' } });
    addPoints(baseTask);
    const { scoring } = useStore.getState();
    expect(scoring.totalScore).toBe(10);
    expect(scoring.currentPeriodScore).toBe(0);
  });

  it('increments requiredCompleted for required tasks', () => {
    addPoints({ ...baseTask, type: 'required' });
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodRequiredCompleted).toBe(1);
  });

  it('does not increment requiredCompleted for optional tasks', () => {
    addPoints(baseTask);
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });
});

describe('evaluateGoal', () => {
  const scoring: ScoreState = { totalScore: 100, currentPeriodScore: 50, currentPeriodRequiredCompleted: 2 };

  it('returns false in no_goal mode', () => {
    expect(evaluateGoal(scoring, { ...baseSettings, mode: 'no_goal' })).toBe(false);
  });

  it('points goal: met when currentPeriodScore >= targetScore', () => {
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'points', targetScore: 50 })).toBe(true);
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'points', targetScore: 51 })).toBe(false);
  });

  it('required_tasks goal: met when requiredCompleted >= target', () => {
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'required_tasks', targetRequiredTaskCount: 2 })).toBe(true);
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'required_tasks', targetRequiredTaskCount: 3 })).toBe(false);
  });

  it('combined goal: requires both conditions', () => {
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'combined', targetScore: 50, targetRequiredTaskCount: 2 })).toBe(true);
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'combined', targetScore: 51, targetRequiredTaskCount: 2 })).toBe(false);
    expect(evaluateGoal(scoring, { ...baseSettings, goalType: 'combined', targetScore: 50, targetRequiredTaskCount: 3 })).toBe(false);
  });
});

describe('applyBonus', () => {
  it('adds bonus points (multiplier - 1) * periodScore to totalScore', () => {
    useStore.setState({ scoring: { totalScore: 100, currentPeriodScore: 50, currentPeriodRequiredCompleted: 0 } });
    applyBonus(50);
    const { scoring } = useStore.getState();
    // bonus = 50 * (1.5 - 1) = 25
    expect(scoring.totalScore).toBe(125);
  });

  it('does not apply bonus when multiplier is 1', () => {
    useStore.setState({
      settings: { ...baseSettings, bonusMultiplier: 1 },
      scoring: { totalScore: 100, currentPeriodScore: 50, currentPeriodRequiredCompleted: 0 },
    });
    applyBonus(50);
    expect(useStore.getState().scoring.totalScore).toBe(100);
  });
});

describe('resetPeriodProgress', () => {
  it('zeroes period score and required count while keeping totalScore', () => {
    useStore.setState({ scoring: { totalScore: 200, currentPeriodScore: 80, currentPeriodRequiredCompleted: 3 } });
    resetPeriodProgress();
    const { scoring } = useStore.getState();
    expect(scoring.totalScore).toBe(200);
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });
});
