import { useStore } from '../../store';
import type { Task } from '../tasks/types';
import { growthMinutes } from '../tasks/types';
import type { Settings } from '../settings/types';
import type { ScoreState } from './types';

function getStore() {
  return useStore.getState();
}

/**
 * Credit a task's Growth Minutes (baseTimeMinutes × difficultyMultiplier) to
 * the current score. Named `addPoints` for historical continuity — the value
 * being added is the task's effective Growth Minutes.
 */
export function addPoints(task: Task): void {
  const { scoring, settings } = getStore();
  const inPeriod = settings.mode !== 'no_goal';
  const credit = growthMinutes(task);
  getStore().setScoring({
    totalScore: scoring.totalScore + credit,
    currentPeriodScore: inPeriod ? scoring.currentPeriodScore + credit : scoring.currentPeriodScore,
    currentPeriodRequiredCompleted:
      inPeriod && task.type === 'required'
        ? scoring.currentPeriodRequiredCompleted + 1
        : scoring.currentPeriodRequiredCompleted,
  });
}

export function evaluateGoal(scoring: ScoreState, settings: Settings): boolean {
  if (settings.mode === 'no_goal') return false;
  switch (settings.goalType) {
    case 'points':
      return scoring.currentPeriodScore >= settings.targetScore;
    case 'required_tasks':
      return scoring.currentPeriodRequiredCompleted >= settings.targetRequiredTaskCount;
    case 'combined':
      return (
        scoring.currentPeriodScore >= settings.targetScore &&
        scoring.currentPeriodRequiredCompleted >= settings.targetRequiredTaskCount
      );
  }
}

export function applyBonus(periodScore: number): void {
  const { scoring, settings } = getStore();
  // Bonus = extra points on top of what was already credited during the period
  const bonus = Math.round(periodScore * (settings.bonusMultiplier - 1));
  if (bonus > 0) {
    getStore().setScoring({ ...scoring, totalScore: scoring.totalScore + bonus });
  }
}

export function resetPeriodProgress(): void {
  const { scoring } = getStore();
  getStore().setScoring({
    ...scoring,
    currentPeriodScore: 0,
    currentPeriodRequiredCompleted: 0,
  });
}
