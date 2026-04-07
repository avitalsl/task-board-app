import { useStore } from '../../store';
import { computeNodeRadius } from '../board/layoutService';
import type { Direction, AvatarConfig } from './avatarConfig';
import { AVATARS } from './avatarConfig';

const SPEED = 200;
const ARRIVAL_THRESHOLD = 3;
const PROXIMITY_RADIUS = 20;
const WALK_SEQUENCE: Array<1 | 2 | 3> = [1, 2, 3, 2]; // pendulum avoids snap from 3→1
const WALK_CYCLE_DISTANCE = 20; // px per frame advance
const BOB_AMPLITUDE = 2; // px of vertical bob while walking

let animFrameId: number | null = null;
let lastTimestamp: number | null = null;
let avatarElement: SVGGElement | null = null;
let imageElement: SVGImageElement | null = null;
let currentAvatarConfig: AvatarConfig | null = null;
let currentPos = { x: 0, y: 0 };
let target: { x: number; y: number } | null = null;
let currentDirection: Direction = 'front';
let distanceTraveled = 0;
let walkPhase = 0;

export function setAvatarElement(el: SVGGElement | null, initialX = 0, initialY = 0) {
  avatarElement = el;
  if (el) {
    currentPos = { x: initialX, y: initialY };
  }
}

export function setAvatarFrames(el: SVGImageElement | null, avatarId: string) {
  imageElement = el;
  currentAvatarConfig = AVATARS.find((a) => a.id === avatarId) ?? null;
  currentDirection = 'front';
  distanceTraveled = 0;
  walkPhase = 0;
  if (el && currentAvatarConfig) {
    el.setAttribute('href', currentAvatarConfig.frameUrl('front', 1));
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

    // Reset walk to idle
    distanceTraveled = 0;
    walkPhase = 0;
    currentDirection = 'front';
    if (imageElement && currentAvatarConfig) {
      imageElement.setAttribute('href', currentAvatarConfig.frameUrl('front', 1));
    }

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
      avatarId: useStore.getState().avatar.avatarId,
    });
  } else {
    const step = SPEED * delta;
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;

    currentPos = {
      x: Math.abs(moveX) > Math.abs(dx) ? target.x : currentPos.x + moveX,
      y: Math.abs(moveY) > Math.abs(dy) ? target.y : currentPos.y + moveY,
    };

    // Update direction from movement vector
    const newDir: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? 'right' : 'left'
        : dy > 0 ? 'front' : 'back';
    currentDirection = newDir;

    // Advance walk frame based on distance traveled
    const stepDist = Math.sqrt(moveX * moveX + moveY * moveY);
    distanceTraveled += stepDist;
    if (distanceTraveled >= WALK_CYCLE_DISTANCE) {
      distanceTraveled -= WALK_CYCLE_DISTANCE;
      walkPhase = (walkPhase + 1) % WALK_SEQUENCE.length;
    }

    // Vertical bob: rises mid-stride, lands at each step
    const bobY = -Math.abs(Math.sin(Math.PI * distanceTraveled / WALK_CYCLE_DISTANCE)) * BOB_AMPLITUDE;
    avatarElement.setAttribute('transform', `translate(${currentPos.x}, ${currentPos.y + bobY})`);

    if (imageElement && currentAvatarConfig) {
      imageElement.setAttribute(
        'href',
        currentAvatarConfig.frameUrl(currentDirection, WALK_SEQUENCE[walkPhase])
      );
    }
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
