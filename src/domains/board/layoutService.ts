import type { Task } from '../tasks/types';

const MIN_RADIUS = 28;
const MAX_RADIUS = 62;
const EDGE_PADDING = 16;
const NODE_GAP = 12;

export function computeNodeRadius(points: number): number {
  const clamped = Math.max(1, Math.min(points, 100));
  return MIN_RADIUS + ((clamped - 1) / 99) * (MAX_RADIUS - MIN_RADIUS);
}

function doesOverlap(
  x: number,
  y: number,
  radius: number,
  placedTasks: Task[]
): boolean {
  return placedTasks.some((t) => {
    const existingRadius = computeNodeRadius(t.points);
    const minDist = radius + existingRadius + NODE_GAP;
    const dx = x - t.position.x;
    const dy = y - t.position.y;
    return dx * dx + dy * dy < minDist * minDist;
  });
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

  // Divide the board into a grid of cells for balanced distribution
  const cellSize = Math.max(MAX_RADIUS * 3, 120);
  const cols = Math.max(1, Math.floor((maxX - minX) / cellSize));
  const rows = Math.max(1, Math.floor((maxY - minY) / cellSize));
  const cellW = (maxX - minX) / cols;
  const cellH = (maxY - minY) / rows;

  // Count how many placed tasks fall in each cell
  const cellCounts: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );
  for (const t of placedTasks) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor((t.position.x - minX) / cellW)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((t.position.y - minY) / cellH)));
    cellCounts[row][col]++;
  }

  // Build a list of all cells, sorted by count (least populated first), then shuffled within same count
  const cells: { row: number; col: number; count: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ row: r, col: c, count: cellCounts[r][c] });
    }
  }
  cells.sort((a, b) => a.count - b.count || Math.random() - 0.5);

  // Try to place in the least populated cells first, with random jitter within the cell
  for (const cell of cells) {
    const cellMinX = minX + cell.col * cellW;
    const cellMinY = minY + cell.row * cellH;

    for (let attempt = 0; attempt < 10; attempt++) {
      const x = cellMinX + Math.random() * cellW;
      const y = cellMinY + Math.random() * cellH;

      // Clamp to board bounds
      const cx = Math.max(minX, Math.min(maxX, x));
      const cy = Math.max(minY, Math.min(maxY, y));

      if (!doesOverlap(cx, cy, radius, placedTasks)) {
        return { x: cx, y: cy };
      }
    }
  }

  // Fallback: pure random attempts
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if (!doesOverlap(x, y, radius, placedTasks)) {
      return { x, y };
    }
  }

  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY),
  };
}
