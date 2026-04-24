import { useStore } from '../../store';
import { computeNodeRadius } from './layoutService';
import { growthMinutes } from '../tasks/types';

const PROXIMITY_RADIUS = 20;

export function isAvatarNearTask(taskId: string): boolean {
  const { avatar, tasks } = useStore.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.position) return false;

  const radius = computeNodeRadius(growthMinutes(task));
  const dx = avatar.position.x - task.position.x;
  const dy = avatar.position.y - task.position.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius + PROXIMITY_RADIUS;
}

export function clearSelection(): void {
  const { avatar } = useStore.getState();
  if (avatar.selectedTaskId !== null) {
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: null });
  }
}
