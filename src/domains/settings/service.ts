import { useStore } from '../../store';
import type { GoalMode, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { DEFAULT_SCORE_STATE } from '../scoring/types';
import { initPeriod } from '../periods/service';

function getStore() {
  return useStore.getState();
}

export function updateSettings(patch: Partial<Settings>): void {
  const current = getStore().settings;
  getStore().setSettings({ ...current, ...patch });
}

export function changeMode(mode: GoalMode): void {
  const store = getStore();
  // Reset period progress; totalScore and task completion state are unchanged
  store.setSettings({ ...store.settings, mode });
  store.setScoring({
    ...store.scoring,
    currentPeriodScore: 0,
    currentPeriodRequiredCompleted: 0,
  });
  initPeriod(mode);
}

export function updateTargetScore(targetScore: number): void {
  const store = getStore();
  store.setSettings({ ...store.settings, targetScore });
  // Reset period goal progress when target changes
  store.setScoring({
    ...store.scoring,
    currentPeriodScore: 0,
    currentPeriodRequiredCompleted: 0,
  });
}

export function resetToDefaults(): void {
  const store = getStore();
  store.setSettings(DEFAULT_SETTINGS);
  store.setScoring(DEFAULT_SCORE_STATE);
  store.setPeriod(null);
}
