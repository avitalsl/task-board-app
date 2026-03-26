import type { TaskType } from '../tasks/types';

export interface ParsedTask {
  title: string;
  description: string;
  points: number;
  type: TaskType;
}
