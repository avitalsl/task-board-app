import { useStore } from '../../store';
import { completeTask } from '../tasks/service';
import { addPoints } from '../scoring/service';
import { computeNodeRadius } from './layoutService';

const PROXIMITY_RADIUS = 20;

export function isAvatarNearTask(taskId: string): boolean {
  const { avatar, tasks } = useStore.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return false;

  const radius = computeNodeRadius(task.points);
  const dx = avatar.position.x - task.position.x;
  const dy = avatar.position.y - task.position.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius + PROXIMITY_RADIUS;
}

export function handleTaskComplete(taskId: string): void {
  const task = useStore.getState().tasks.find((t) => t.id === taskId);
  if (!task || task.isCompleted) return;

  addPoints(task);
  completeTask(taskId);
  clearSelection();
}

export function clearSelection(): void {
  const { avatar } = useStore.getState();
  if (avatar.selectedTaskId !== null) {
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: null });
  }
}
