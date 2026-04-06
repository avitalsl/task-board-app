import { addPoints } from '../domains/scoring/service';
import { completeTask } from '../domains/tasks/service';
import { clearSelection } from '../domains/board/boardLogicService';
import { storePort } from './storePort';

export function handleTaskComplete(taskId: string): void {
  const task = storePort.getTask(taskId);
  if (!task || task.isCompleted) return;

  addPoints(task);
  completeTask(taskId);
  clearSelection();
}

export { clearSelection } from '../domains/board/boardLogicService';
