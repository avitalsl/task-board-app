import { nanoid } from 'nanoid';
import { useStore } from '../../store';
import type { Task, TaskType, LifecycleType } from './types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  points: number;
  type: TaskType;
  lifecycleType: LifecycleType;
}

export interface EditTaskInput {
  title?: string;
  description?: string;
  points?: number;
  type?: TaskType;
  lifecycleType?: LifecycleType;
}

function getTasks(): Task[] {
  return useStore.getState().tasks;
}

function setTasks(tasks: Task[]): void {
  useStore.getState().setTasks(tasks);
}

export function createTask(input: CreateTaskInput): Task {
  const task: Task = {
    id: nanoid(),
    title: input.title,
    description: input.description ?? '',
    points: input.points,
    type: input.type,
    lifecycleType: input.lifecycleType,
    position: { x: 0, y: 0 }, // board layout service assigns real position
    isActive: true,
    isCompleted: false,
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setTasks([...getTasks(), task]);
  return task;
}

export function assignTaskPosition(id: string, position: { x: number; y: number }): void {
  setTasks(getTasks().map((t) => (t.id === id ? { ...t, position } : t)));
}

export function editTask(id: string, input: EditTaskInput): void {
  setTasks(
    getTasks().map((t) =>
      t.id === id ? { ...t, ...input, updatedAt: Date.now() } : t
    )
  );
}

export function deleteTask(id: string): void {
  setTasks(getTasks().filter((t) => t.id !== id));
}

export function duplicateTask(id: string): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const task = tasks[idx];
  const newTask: Task = {
    id: nanoid(),
    title: task.title,
    description: task.description,
    points: task.points,
    type: task.type,
    lifecycleType: task.lifecycleType,
    position: { x: 0, y: 0 },
    isActive: true,
    isCompleted: false,
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const next = [...tasks];
  next.splice(idx + 1, 0, newTask);
  setTasks(next);
  return newTask;
}

export function completeTask(id: string): void {
  setTasks(
    getTasks().map((t) =>
      t.id === id
        ? { ...t, isCompleted: true, isActive: false, completedAt: Date.now(), updatedAt: Date.now() }
        : t
    )
  );
}

export function resetRecurringTasks(): void {
  setTasks(
    getTasks().map((t) =>
      t.lifecycleType === 'recurring' && t.isCompleted
        ? { ...t, isCompleted: false, isActive: true, completedAt: null, updatedAt: Date.now() }
        : t
    )
  );
}
