import Konva from 'konva';
import { useStore } from '../../store';
import { computeNodeRadius } from '../board/layoutService';

const SPEED = 200;
const ARRIVAL_THRESHOLD = 3;
const PROXIMITY_RADIUS = 20;

let animFrameId: number | null = null;
let lastTimestamp: number | null = null;
let avatarNode: Konva.Group | null = null;
let target: { x: number; y: number } | null = null;

export function setAvatarNode(node: Konva.Group | null) {
  avatarNode = node;
}

export function moveTo(pos: { x: number; y: number }) {
  target = pos;
  // Clear selection immediately when starting to move
  const { avatar } = useStore.getState();
  if (avatar.selectedTaskId !== null) {
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: null });
  }
}

function tick(timestamp: number) {
  if (lastTimestamp === null) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (!avatarNode || !target) {
    animFrameId = requestAnimationFrame(tick);
    return;
  }

  const curX = avatarNode.x();
  const curY = avatarNode.y();
  const dx = target.x - curX;
  const dy = target.y - curY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVAL_THRESHOLD) {
    // Snap to target
    avatarNode.x(target.x);
    avatarNode.y(target.y);
    avatarNode.getLayer()?.batchDraw();

    const arrivalPos = { x: target.x, y: target.y };
    target = null;

    // Check proximity to tasks — one store write on arrival
    const { tasks } = useStore.getState();
    const activeTasks = tasks.filter((t) => t.isActive);
    let nearbyTaskId: string | null = null;
    for (const task of activeTasks) {
      const taskRadius = computeNodeRadius(task.points);
      const tdx = arrivalPos.x - task.position.x;
      const tdy = arrivalPos.y - task.position.y;
      if (Math.sqrt(tdx * tdx + tdy * tdy) <= taskRadius + PROXIMITY_RADIUS) {
        nearbyTaskId = task.id;
        break;
      }
    }

    useStore.getState().setAvatar({
      position: arrivalPos,
      selectedTaskId: nearbyTaskId,
    });
  } else {
    // Move toward target
    const step = SPEED * delta;
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;

    const newX = Math.abs(moveX) > Math.abs(dx) ? target.x : curX + moveX;
    const newY = Math.abs(moveY) > Math.abs(dy) ? target.y : curY + moveY;

    avatarNode.x(newX);
    avatarNode.y(newY);
    avatarNode.getLayer()?.batchDraw();
  }

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
