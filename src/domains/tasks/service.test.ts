import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';
import {
  createTask,
  assignTaskPosition,
  editTask,
  deleteTask,
  duplicateTask,
  completeTask,
  resetRecurringTasks,
} from './service';
import type { Task } from './types';

const baseTask: Task = {
  id: 'task-1',
  title: 'Test task',
  description: '',
  baseTimeMinutes: 10,
  difficultyMultiplier: 1,
  type: 'optional',
  lifecycleType: 'recurring',
  position: null,
  isActive: true,
  isCompleted: false,
  completedAt: null,
  completionCount: 0,
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(() => {
  useStore.setState({ tasks: [] });
});

describe('createTask', () => {
  it('returns a task with the supplied fields', () => {
    const task = createTask({
      title: 'My task',
      baseTimeMinutes: 20,
      difficultyMultiplier: 2,
      type: 'required',
      lifecycleType: 'one_time',
    });
    expect(task.title).toBe('My task');
    expect(task.baseTimeMinutes).toBe(20);
    expect(task.difficultyMultiplier).toBe(2);
    expect(task.type).toBe('required');
    expect(task.lifecycleType).toBe('one_time');
  });

  it('defaults difficultyMultiplier to 1 when not provided', () => {
    const task = createTask({ title: 'T', baseTimeMinutes: 15, type: 'optional', lifecycleType: 'recurring' });
    expect(task.difficultyMultiplier).toBe(1);
  });

  it('initialises default fields correctly', () => {
    const task = createTask({ title: 'T', baseTimeMinutes: 5, type: 'optional', lifecycleType: 'recurring' });
    expect(task.id).toBeTruthy();
    expect(task.description).toBe('');
    expect(task.position).toBeNull();
    expect(task.isActive).toBe(true);
    expect(task.isCompleted).toBe(false);
    expect(task.completedAt).toBeNull();
  });

  it('adds the new task to the store', () => {
    const task = createTask({ title: 'T', baseTimeMinutes: 5, type: 'optional', lifecycleType: 'recurring' });
    const { tasks } = useStore.getState();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task.id);
  });

  it('preserves existing tasks when adding a new one', () => {
    useStore.setState({ tasks: [baseTask] });
    createTask({ title: 'Second', baseTimeMinutes: 1, type: 'optional', lifecycleType: 'recurring' });
    expect(useStore.getState().tasks).toHaveLength(2);
  });

  it('uses the provided description when given', () => {
    const task = createTask({
      title: 'T',
      baseTimeMinutes: 1,
      type: 'optional',
      lifecycleType: 'recurring',
      description: 'my desc',
    });
    expect(task.description).toBe('my desc');
  });
});

describe('assignTaskPosition', () => {
  it('updates the position of the target task', () => {
    useStore.setState({ tasks: [baseTask] });
    assignTaskPosition('task-1', { x: 50, y: 75 });
    const task = useStore.getState().tasks[0];
    expect(task.position).toEqual({ x: 50, y: 75 });
  });

  it('leaves other tasks unchanged', () => {
    const other: Task = { ...baseTask, id: 'task-2' };
    useStore.setState({ tasks: [baseTask, other] });
    assignTaskPosition('task-1', { x: 10, y: 20 });
    const tasks = useStore.getState().tasks;
    expect(tasks.find((t) => t.id === 'task-2')!.position).toBeNull();
  });

  it('is a no-op for an unknown id', () => {
    useStore.setState({ tasks: [baseTask] });
    assignTaskPosition('unknown', { x: 10, y: 20 });
    expect(useStore.getState().tasks[0].position).toBeNull();
  });
});

describe('editTask', () => {
  it('merges the supplied fields into the task', () => {
    useStore.setState({ tasks: [baseTask] });
    editTask('task-1', { title: 'Renamed', baseTimeMinutes: 99 });
    const task = useStore.getState().tasks[0];
    expect(task.title).toBe('Renamed');
    expect(task.baseTimeMinutes).toBe(99);
  });

  it('leaves unspecified fields unchanged', () => {
    useStore.setState({ tasks: [baseTask] });
    editTask('task-1', { title: 'New title' });
    const task = useStore.getState().tasks[0];
    expect(task.type).toBe('optional');
    expect(task.lifecycleType).toBe('recurring');
    expect(task.baseTimeMinutes).toBe(10);
    expect(task.difficultyMultiplier).toBe(1);
  });

  it('updates updatedAt', () => {
    useStore.setState({ tasks: [{ ...baseTask, updatedAt: 0 }] });
    editTask('task-1', { title: 'X' });
    expect(useStore.getState().tasks[0].updatedAt).toBeGreaterThan(0);
  });
});

describe('deleteTask', () => {
  it('removes the target task from the store', () => {
    useStore.setState({ tasks: [baseTask] });
    deleteTask('task-1');
    expect(useStore.getState().tasks).toHaveLength(0);
  });

  it('leaves other tasks in place', () => {
    const other: Task = { ...baseTask, id: 'task-2' };
    useStore.setState({ tasks: [baseTask, other] });
    deleteTask('task-1');
    const { tasks } = useStore.getState();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-2');
  });
});

describe('duplicateTask', () => {
  it('returns null for an unknown id', () => {
    expect(duplicateTask('ghost')).toBeNull();
  });

  it('returns a copy with a new id', () => {
    useStore.setState({ tasks: [baseTask] });
    const copy = duplicateTask('task-1');
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe('task-1');
  });

  it('inserts the copy immediately after the original', () => {
    const taskA: Task = { ...baseTask, id: 'A' };
    const taskB: Task = { ...baseTask, id: 'B' };
    useStore.setState({ tasks: [taskA, taskB] });
    duplicateTask('A');
    const ids = useStore.getState().tasks.map((t) => t.id);
    expect(ids[0]).toBe('A');
    expect(ids[2]).toBe('B');
  });

  it('copies source task fields', () => {
    useStore.setState({ tasks: [{ ...baseTask, title: 'Original', baseTimeMinutes: 42, difficultyMultiplier: 3 }] });
    const copy = duplicateTask('task-1')!;
    expect(copy.title).toBe('Original');
    expect(copy.baseTimeMinutes).toBe(42);
    expect(copy.difficultyMultiplier).toBe(3);
    expect(copy.type).toBe('optional');
    expect(copy.lifecycleType).toBe('recurring');
  });

  it('resets copy to active/incomplete state regardless of original', () => {
    const completed: Task = { ...baseTask, isCompleted: true, isActive: false, completedAt: 123 };
    useStore.setState({ tasks: [completed] });
    const copy = duplicateTask('task-1')!;
    expect(copy.isCompleted).toBe(false);
    expect(copy.isActive).toBe(true);
    expect(copy.completedAt).toBeNull();
    expect(copy.position).toBeNull();
  });
});

describe('completeTask', () => {
  it('marks task as completed and inactive', () => {
    useStore.setState({ tasks: [baseTask] });
    completeTask('task-1');
    const task = useStore.getState().tasks[0];
    expect(task.isCompleted).toBe(true);
    expect(task.isActive).toBe(false);
  });

  it('increments completionCount', () => {
    useStore.setState({ tasks: [baseTask] });
    completeTask('task-1');
    expect(useStore.getState().tasks[0].completionCount).toBe(1);
  });

  it('sets completedAt to a non-null timestamp', () => {
    useStore.setState({ tasks: [baseTask] });
    completeTask('task-1');
    expect(useStore.getState().tasks[0].completedAt).toBeGreaterThan(0);
  });

  it('leaves other tasks unchanged', () => {
    const other: Task = { ...baseTask, id: 'task-2' };
    useStore.setState({ tasks: [baseTask, other] });
    completeTask('task-1');
    expect(useStore.getState().tasks[1].isCompleted).toBe(false);
  });
});

describe('resetRecurringTasks', () => {
  it('resets all recurring tasks to active, uncompleted, zero count', () => {
    const completed: Task = { ...baseTask, isCompleted: true, isActive: false, completedAt: 1, completionCount: 3 };
    useStore.setState({ tasks: [completed] });
    resetRecurringTasks();
    const task = useStore.getState().tasks[0];
    expect(task.isCompleted).toBe(false);
    expect(task.isActive).toBe(true);
    expect(task.completedAt).toBeNull();
    expect(task.completionCount).toBe(0);
  });

  it('leaves completed one-time tasks unchanged', () => {
    const oneTime: Task = {
      ...baseTask,
      lifecycleType: 'one_time',
      isCompleted: true,
      isActive: false,
      completedAt: 1,
    };
    useStore.setState({ tasks: [oneTime] });
    resetRecurringTasks();
    const task = useStore.getState().tasks[0];
    expect(task.isCompleted).toBe(true);
    expect(task.isActive).toBe(false);
  });

  it('resets active recurring tasks completionCount to 0', () => {
    useStore.setState({ tasks: [{ ...baseTask, completionCount: 2 }] });
    resetRecurringTasks();
    expect(useStore.getState().tasks[0].completionCount).toBe(0);
  });
});
