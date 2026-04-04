import { useStore } from '../../store';
import { computeNodeRadius } from '../board/layoutService';

const SPEED = 200;
const ARRIVAL_THRESHOLD = 3;
const PROXIMITY_RADIUS = 20;

let animFrameId: number | null = null;
let lastTimestamp: number | null = null;
let avatarElement: SVGGElement | null = null;
let currentPos = { x: 0, y: 0 };
let target: { x: number; y: number } | null = null;

export function setAvatarElement(el: SVGGElement | null, initialX = 0, initialY = 0) {
  avatarElement = el;
  if (el) {
    currentPos = { x: initialX, y: initialY };
  }
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

  if (!avatarElement || !target) {
    animFrameId = requestAnimationFrame(tick);
    return;
  }

  const dx = target.x - currentPos.x;
  const dy = target.y - currentPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < ARRIVAL_THRESHOLD) {
    currentPos = { x: target.x, y: target.y };
    avatarElement.setAttribute('transform', `translate(${currentPos.x}, ${currentPos.y})`);

    const arrivalPos = { ...currentPos };
    target = null;

    // Check proximity to tasks — one store write on arrival
    const { tasks } = useStore.getState();
    const activeTasks = tasks.filter((t) => t.isActive);
    let nearbyTaskId: string | null = null;
    for (const task of activeTasks) {
      if (!task.position) continue;
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
    const step = SPEED * delta;
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;

    currentPos = {
      x: Math.abs(moveX) > Math.abs(dx) ? target.x : currentPos.x + moveX,
      y: Math.abs(moveY) > Math.abs(dy) ? target.y : currentPos.y + moveY,
    };
    avatarElement.setAttribute('transform', `translate(${currentPos.x}, ${currentPos.y})`);
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
