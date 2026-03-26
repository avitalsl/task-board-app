import { useStore } from '../../store';
import { computeNodeRadius } from '../board/layoutService';

const SPEED = 200; // pixels per second
const ARRIVAL_THRESHOLD = 3;
const PROXIMITY_RADIUS = 20; // extra distance beyond node radius to trigger interaction

let animFrameId: number | null = null;
let lastTimestamp: number | null = null;

function tick(timestamp: number) {
  if (lastTimestamp === null) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const { avatar, tasks, setAvatar } = useStore.getState();
  if (!avatar.targetPosition) {
    if (avatar.isMoving) {
      setAvatar({ ...avatar, isMoving: false });
    }
    animFrameId = requestAnimationFrame(tick);
    return;
  }

  const dx = avatar.targetPosition.x - avatar.position.x;
  const dy = avatar.targetPosition.y - avatar.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVAL_THRESHOLD) {
    // Arrived at target
    const newAvatar = {
      ...avatar,
      position: avatar.targetPosition,
      targetPosition: null,
      isMoving: false,
    };

    // Check proximity to active tasks
    const activeTasks = tasks.filter((t) => t.isActive);
    let nearbyTaskId: string | null = null;
    for (const task of activeTasks) {
      const taskRadius = computeNodeRadius(task.points);
      const tdx = avatar.targetPosition.x - task.position.x;
      const tdy = avatar.targetPosition.y - task.position.y;
      const taskDist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (taskDist <= taskRadius + PROXIMITY_RADIUS) {
        nearbyTaskId = task.id;
        break;
      }
    }

    setAvatar({ ...newAvatar, selectedTaskId: nearbyTaskId });
    animFrameId = requestAnimationFrame(tick);
    return;
  }

  // Move toward target
  const moveX = (dx / dist) * SPEED * delta;
  const moveY = (dy / dist) * SPEED * delta;

  // Don't overshoot
  const newX = Math.abs(moveX) > Math.abs(dx) ? avatar.targetPosition.x : avatar.position.x + moveX;
  const newY = Math.abs(moveY) > Math.abs(dy) ? avatar.targetPosition.y : avatar.position.y + moveY;

  setAvatar({
    ...avatar,
    position: { x: newX, y: newY },
    isMoving: true,
    selectedTaskId: null, // clear selection while moving
  });

  animFrameId = requestAnimationFrame(tick);
}

export function startEngine() {
  if (animFrameId !== null) return;
  lastTimestamp = null;
  animFrameId = requestAnimationFrame(tick);
}

export function stopEngine() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
    lastTimestamp = null;
  }
}
