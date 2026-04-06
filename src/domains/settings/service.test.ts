import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';
import { updateSettings } from './service';
import { changeMode, updateTargetScore, resetToDefaults } from '../../application/settingsActions';
import { DEFAULT_SETTINGS } from './types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import type { Settings } from './types';
import type { ScoreState } from '../scoring/types';

const baseSettings: Settings = {
  mode: 'daily',
  targetScore: 50,
  targetRequiredTaskCount: 2,
  goalType: 'points',
  bonusMultiplier: 1.5,
  resetHour: 22,
};

const baseScoring: ScoreState = {
  totalScore: 100,
  currentPeriodScore: 40,
  currentPeriodRequiredCompleted: 2,
};

beforeEach(() => {
  useStore.setState({
    tasks: [],
    settings: baseSettings,
    scoring: baseScoring,
    period: null,
    periodHistory: [],
  });
});

describe('updateSettings', () => {
  it('merges a partial patch into the current settings', () => {
    updateSettings({ targetScore: 99 });
    expect(useStore.getState().settings.targetScore).toBe(99);
  });

  it('leaves unpatched fields unchanged', () => {
    updateSettings({ targetScore: 99 });
    const { settings } = useStore.getState();
    expect(settings.mode).toBe('daily');
    expect(settings.bonusMultiplier).toBe(1.5);
    expect(settings.goalType).toBe('points');
  });

  it('applies multiple patched fields at once', () => {
    updateSettings({ targetScore: 200, goalType: 'required_tasks' });
    const { settings } = useStore.getState();
    expect(settings.targetScore).toBe(200);
    expect(settings.goalType).toBe('required_tasks');
  });
});

describe('changeMode', () => {
  it('updates settings.mode', () => {
    changeMode('weekly');
    expect(useStore.getState().settings.mode).toBe('weekly');
  });

  it('resets currentPeriodScore and currentPeriodRequiredCompleted to 0', () => {
    changeMode('weekly');
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });

  it('preserves totalScore when resetting period scores', () => {
    changeMode('weekly');
    expect(useStore.getState().scoring.totalScore).toBe(100);
  });

  it('sets period to null when switching to no_goal', () => {
    changeMode('no_goal');
    expect(useStore.getState().period).toBeNull();
  });

  it('creates a period when switching to daily', () => {
    useStore.setState({ settings: { ...baseSettings, mode: 'no_goal' }, period: null });
    changeMode('daily');
    expect(useStore.getState().period).not.toBeNull();
  });
});

describe('updateTargetScore', () => {
  it('updates settings.targetScore', () => {
    updateTargetScore(150);
    expect(useStore.getState().settings.targetScore).toBe(150);
  });

  it('resets currentPeriodScore and currentPeriodRequiredCompleted to 0', () => {
    updateTargetScore(150);
    const { scoring } = useStore.getState();
    expect(scoring.currentPeriodScore).toBe(0);
    expect(scoring.currentPeriodRequiredCompleted).toBe(0);
  });

  it('preserves totalScore when resetting period scores', () => {
    updateTargetScore(150);
    expect(useStore.getState().scoring.totalScore).toBe(100);
  });
});

describe('resetToDefaults', () => {
  it('resets settings to DEFAULT_SETTINGS', () => {
    resetToDefaults();
    expect(useStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('resets scoring to DEFAULT_SCORE_STATE', () => {
    resetToDefaults();
    expect(useStore.getState().scoring).toEqual(DEFAULT_SCORE_STATE);
  });

  it('sets period to null', () => {
    useStore.setState({ period: { currentPeriodId: 'x', mode: 'daily', start: 0, end: 1, lastResetAt: 0, anchorStartAt: 0, resetHour: 22 } });
    resetToDefaults();
    expect(useStore.getState().period).toBeNull();
  });
});
