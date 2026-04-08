export type TaskType = 'required' | 'optional';
export type LifecycleType = 'recurring' | 'one_time';

export interface Task {
  id: string;
  boardId?: string;
  title: string;
  description: string;
  points: number;
  type: TaskType;
  lifecycleType: LifecycleType;
  position: { x: number; y: number } | null;
  isActive: boolean;
  isCompleted: boolean;
  completedAt: number | null;
  completionCount: number;
  createdAt: number;
  updatedAt: number;
}
