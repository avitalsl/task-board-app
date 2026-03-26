import type { Task } from '../tasks/types';

const MIN_RADIUS = 28;
const MAX_RADIUS = 62;
const EDGE_PADDING = 16;
const NODE_GAP = 12;

export function computeNodeRadius(points: number): number {
  const clamped = Math.max(1, Math.min(points, 100));
  return MIN_RADIUS + ((clamped - 1) / 99) * (MAX_RADIUS - MIN_RADIUS);
}

export function assignPosition(
  radius: number,
  placedTasks: Task[],
  boardWidth: number,
  boardHeight: number
): { x: number; y: number } {
  const minX = EDGE_PADDING + radius;
  const maxX = boardWidth - EDGE_PADDING - radius;
  const minY = EDGE_PADDING + radius;
  const maxY = boardHeight - EDGE_PADDING - radius;

  for (let attempt = 0; attempt < 150; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);

    const overlaps = placedTasks.some((t) => {
      const existingRadius = computeNodeRadius(t.points);
      const minDist = radius + existingRadius + NODE_GAP;
      const dx = x - t.position.x;
      const dy = y - t.position.y;
      return dx * dx + dy * dy < minDist * minDist;
    });

    if (!overlaps) return { x, y };
  }

  // Fallback: return a random position (board may be too crowded)
  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY),
  };
}
