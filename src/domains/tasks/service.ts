import { nanoid } from 'nanoid';
import { useStore } from '../../store';
import { DEFAULT_BOARD_ID } from '../board/constants';
import { hashId } from '../board/blobUtils';
import type { Task, TaskType, LifecycleType } from './types';

export const NOTE_PALETTE_SIZE = 30;

function pickNoteColorIndex(existingTasks: Task[]): number {
  const active = existingTasks.filter(t => t.isActive && !t.isCompleted);
  const counts = new Array(NOTE_PALETTE_SIZE).fill(0);
  for (const t of active) {
    // Legacy tasks without colorIndex display via hash in the 0-5 range.
    const ci = t.colorIndex !== undefined ? t.colorIndex : hashId(t.id) % 6;
    if (ci >= 0 && ci < NOTE_PALETTE_SIZE) counts[ci]++;
  }
  const minCount = Math.min(...counts);
  const candidates = counts.reduce<number[]>((acc, c, i) => { if (c === minCount) acc.push(i); return acc; }, []);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  baseTimeMinutes: number;
  difficultyMultiplier?: number;
  type: TaskType;
  lifecycleType: LifecycleType;
}

export interface EditTaskInput {
  title?: string;
  description?: string;
  baseTimeMinutes?: number;
  difficultyMultiplier?: number;
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
  const existing = getTasks();
  const task: Task = {
    id: nanoid(),
    boardId: DEFAULT_BOARD_ID,
    title: input.title,
    description: input.description ?? '',
    baseTimeMinutes: input.baseTimeMinutes,
    difficultyMultiplier: input.difficultyMultiplier ?? 1,
    type: input.type,
    lifecycleType: input.lifecycleType,
    position: null,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    completionCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colorIndex: pickNoteColorIndex(existing),
  };
  setTasks([...existing, task]);
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
    boardId: task.boardId ?? DEFAULT_BOARD_ID,
    title: task.title,
    description: task.description,
    baseTimeMinutes: task.baseTimeMinutes,
    difficultyMultiplier: task.difficultyMultiplier,
    type: task.type,
    lifecycleType: task.lifecycleType,
    position: null,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    completionCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    colorIndex: pickNoteColorIndex(tasks),
  };
  const next = [...tasks];
  next.splice(idx + 1, 0, newTask);
  setTasks(next);
  return newTask;
}

export function completeTask(id: string): void {
  setTasks(
    getTasks().map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        isCompleted: true,
        isActive: false,
        completedAt: Date.now(),
        completionCount: t.completionCount + 1,
        updatedAt: Date.now(),
      };
    })
  );
}

export function reactivateRecurringTask(id: string): void {
  setTasks(
    getTasks().map((t) =>
      t.id === id && t.lifecycleType === 'recurring'
        ? { ...t, isCompleted: false, isActive: true, updatedAt: Date.now() }
        : t
    )
  );
}

export function resetRecurringTasks(): void {
  setTasks(
    getTasks().map((t) =>
      t.lifecycleType === 'recurring'
        ? { ...t, isCompleted: false, isActive: true, completedAt: null, completionCount: 0, updatedAt: Date.now() }
        : t
    )
  );
}
