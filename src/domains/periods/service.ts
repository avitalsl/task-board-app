import { useStore } from '../../store';
import { DEFAULT_BOARD_ID } from '../board/constants';
import type { GoalMode, Settings } from '../settings/types';
import type { Period, PeriodHistoryEntry } from './types';
import { evaluateGoal, applyBonus, resetPeriodProgress } from '../scoring/service';
import { resetRecurringTasks } from '../tasks/service';

function getStore() {
  return useStore.getState();
}

/**
 * Compute the end timestamp for a period.
 * Always lands at resetHour:00:00 on the target day.
 */
function computePeriodEnd(start: number, mode: GoalMode, resetHour: number): number {
  const candidate = new Date(start);
  candidate.setHours(resetHour, 0, 0, 0);

  if (mode === 'daily') {
    // Next occurrence of resetHour strictly after start
    if (candidate.getTime() <= start) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.getTime();
  } else {
    // Weekly: start + 7 days at resetHour
    candidate.setDate(candidate.getDate() + 7);
    if (candidate.getTime() <= start) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.getTime();
  }
}

/**
 * Pure computation — returns the initial Period for the given mode, or null
 * for no_goal. Does not touch the store.
 */
export function computeInitialPeriod(
  mode: GoalMode,
  settings: Settings,
  now: number
): Period | null {
  if (mode === 'no_goal') return null;
  return {
    boardId: DEFAULT_BOARD_ID,
    currentPeriodId: crypto.randomUUID(),
    mode,
    start: now,
    end: mode === 'unlimited' ? Number.MAX_SAFE_INTEGER : computePeriodEnd(now, mode, settings.resetHour),
    lastResetAt: now,
    anchorStartAt: now,
    resetHour: mode === 'unlimited' ? 0 : settings.resetHour,
  };
}

/**
 * Initialize a new period for the given mode. Called on first launch
 * or when the user changes the goal mode.
 */
export function initPeriod(mode: GoalMode): void {
  const { settings } = getStore();
  getStore().setPeriod(computeInitialPeriod(mode, settings, Date.now()));
}

/**
 * Finalize the current period: save history, apply bonus if goal met.
 */
function finalizeCurrentPeriod(): void {
  const { period, scoring, settings, periodHistory } = getStore();
  if (!period) return;

  const goalAchieved = evaluateGoal(scoring, settings);
  let bonusApplied = false;

  if (goalAchieved) {
    applyBonus(scoring.currentPeriodScore);
    bonusApplied = true;
  }

  const entry: PeriodHistoryEntry = {
    boardId: period.boardId ?? DEFAULT_BOARD_ID,
    periodId: period.currentPeriodId,
    mode: period.mode,
    start: period.start,
    end: period.end,
    score: scoring.currentPeriodScore,
    requiredCompleted: scoring.currentPeriodRequiredCompleted,
    goalAchieved,
    bonusApplied,
  };

  getStore().setPeriodHistory([...periodHistory, entry]);
}

/**
 * Create the next period immediately following the current one.
 */
function createNextPeriod(current: Period): void {
  const { settings } = getStore();
  const newStart = current.end;
  const next: Period = {
    boardId: current.boardId ?? DEFAULT_BOARD_ID,
    currentPeriodId: crypto.randomUUID(),
    mode: current.mode,
    start: newStart,
    end: computePeriodEnd(newStart, current.mode, current.resetHour),
    lastResetAt: Date.now(),
    anchorStartAt: current.anchorStartAt, // weekly anchor is preserved
    resetHour: settings.resetHour,
  };
  getStore().setPeriod(next);
}

/**
 * Check if the current period has ended and process the reset if so.
 * Handles multiple missed resets (e.g. app closed for several days)
 * by fast-forwarding through empty periods until we land in the current one.
 * Should be called on app start, on visibility resume, and on a 60s interval.
 */
export function checkReset(): void {
  const { settings } = getStore();
  // 'unlimited' mode has no auto-reset; period.end = MAX_SAFE_INTEGER ensures the
  // loop guard would never trigger anyway, but we exit early here for clarity.
  if (settings.mode === 'no_goal' || settings.mode === 'unlimited') return;

  const now = Date.now();
  const MAX_CATCH_UP = 100; // safety limit

  for (let i = 0; i < MAX_CATCH_UP; i++) {
    const { period } = getStore();
    if (!period || now < period.end) break;

    finalizeCurrentPeriod();
    createNextPeriod(period);
    resetPeriodProgress();
    resetRecurringTasks();
  }
}
