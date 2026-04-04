export type TaskType = 'required' | 'optional';
export type LifecycleType = 'recurring' | 'one_time';

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  type: TaskType;
  lifecycleType: LifecycleType;
  position: { x: number; y: number } | null;
  isActive: boolean;
  isCompleted: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
