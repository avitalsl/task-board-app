export type TaskType = 'required' | 'optional';
export type LifecycleType = 'recurring' | 'one_time';

export interface Task {
  id: string;
  boardId?: string;
  title: string;
  description: string;
  baseTimeMinutes: number;
  difficultyMultiplier: number;
  type: TaskType;
  lifecycleType: LifecycleType;
  position: { x: number; y: number } | null;
  isActive: boolean;
  isCompleted: boolean;
  completedAt: number | null;
  completionCount: number;
  createdAt: number;
  updatedAt: number;
  colorIndex?: number;
}

/**
 * Effective Growth Minutes for a task: base time weighted by difficulty.
 * This is the single source of truth for scoring weight and node-size scaling.
 */
export function growthMinutes(
  task: Pick<Task, 'baseTimeMinutes' | 'difficultyMultiplier'>
): number {
  return Math.round(task.baseTimeMinutes * task.difficultyMultiplier);
}

export function formatTimeMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}
