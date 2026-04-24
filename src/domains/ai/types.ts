import type { TaskType } from '../tasks/types';

export interface ParsedTask {
  title: string;
  description: string;
  baseTimeMinutes: number;
  difficultyMultiplier: number;
  type: TaskType;
}
