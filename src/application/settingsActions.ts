import type { GoalMode } from '../domains/settings/types';
import { DEFAULT_SETTINGS } from '../domains/settings/types';
import { DEFAULT_SCORE_STATE } from '../domains/scoring/types';
import { computeInitialPeriod } from '../domains/periods/service';
import { storePort } from './storePort';

export function changeMode(mode: GoalMode): void {
  const settings = storePort.getSettings();
  const scoring  = storePort.getScoring();
  storePort.setSettings({ ...settings, mode });
  storePort.setScoring({ ...scoring, currentPeriodScore: 0, currentPeriodRequiredCompleted: 0 });
  storePort.setPeriod(computeInitialPeriod(mode, { ...settings, mode }, Date.now()));
}

export function updateTargetScore(targetScore: number): void {
  const settings = storePort.getSettings();
  const scoring  = storePort.getScoring();
  storePort.setSettings({ ...settings, targetScore });
  storePort.setScoring({ ...scoring, currentPeriodScore: 0, currentPeriodRequiredCompleted: 0 });
}

export function resetToDefaults(): void {
  storePort.setSettings(DEFAULT_SETTINGS);
  storePort.setScoring(DEFAULT_SCORE_STATE);
  storePort.setPeriod(null);
}
