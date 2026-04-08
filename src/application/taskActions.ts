import { addPoints } from '../domains/scoring/service';
import { completeTask, reactivateRecurringTask } from '../domains/tasks/service';
import { clearSelection } from '../domains/board/boardLogicService';
import { storePort } from './storePort';

const RECURRING_RESET_DELAY_MS = 1500;

export function handleTaskComplete(taskId: string): void {
  const task = storePort.getTask(taskId);
  if (!task || task.isCompleted) return;

  addPoints(task);
  completeTask(taskId);
  clearSelection();

  if (task.lifecycleType === 'recurring') {
    setTimeout(() => reactivateRecurringTask(taskId), RECURRING_RESET_DELAY_MS);
  }
}

export { clearSelection } from '../domains/board/boardLogicService';
