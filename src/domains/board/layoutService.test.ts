import { describe, it, expect } from 'vitest';
import { computeNodeRadius, assignPosition } from './layoutService';
import type { PositionedTask } from './layoutService';

describe('computeNodeRadius', () => {
  it('returns minimum radius for 1 point', () => {
    expect(computeNodeRadius(1)).toBe(28);
  });

  it('returns maximum radius for 100 points', () => {
    expect(computeNodeRadius(100)).toBe(62);
  });

  it('clamps below 1', () => {
    expect(computeNodeRadius(0)).toBe(28);
  });

  it('clamps above 100', () => {
    expect(computeNodeRadius(999)).toBe(62);
  });

  it('scales linearly between min and max', () => {
    const mid = computeNodeRadius(50);
    expect(mid).toBeGreaterThan(28);
    expect(mid).toBeLessThan(62);
  });
});

describe('assignPosition', () => {
  const W = 800;
  const H = 600;

  it('places node within board bounds', () => {
    const radius = 30;
    const pos = assignPosition(radius, [], W, H);
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(radius);
    expect(pos!.x).toBeLessThanOrEqual(W - radius);
    expect(pos!.y).toBeGreaterThanOrEqual(radius);
    expect(pos!.y).toBeLessThanOrEqual(H - radius);
  });

  it('places node without overlapping an existing task', () => {
    const radius = 30;
    // Place one task dead-center
    const existing: PositionedTask[] = [{ position: { x: 400, y: 300 }, points: 10 }];
    const existingRadius = computeNodeRadius(10);

    let nonOverlapping = 0;
    for (let i = 0; i < 20; i++) {
      const pos = assignPosition(radius, existing, W, H);
      if (!pos) continue;
      const dx = pos.x - 400;
      const dy = pos.y - 300;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius + existingRadius + 10) nonOverlapping++;
    }
    // Vast majority should be non-overlapping
    expect(nonOverlapping).toBeGreaterThan(15);
  });

  it('returns null when board is too packed to place a node', () => {
    // Fill a tiny board with max-radius tasks so there is no free space
    const tinyW = 300;
    const tinyH = 300;
    const packed: PositionedTask[] = [
      { position: { x: 62, y: 62 }, points: 100 },
      { position: { x: 186, y: 62 }, points: 100 },
      { position: { x: 62, y: 186 }, points: 100 },
      { position: { x: 186, y: 186 }, points: 100 },
      { position: { x: 124, y: 124 }, points: 100 },
    ];
    const pos = assignPosition(62, packed, tinyW, tinyH);
    expect(pos).toBeNull();
  });
});
