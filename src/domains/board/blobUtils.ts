export const BLOB_SHAPES: number[][] = [
  [0, -1.3, 1.1, 0.8, -1.1, 0.8],
  [-1.2, -0.6, 1.2, -0.6, 1.2, 0.6, -1.2, 0.6],
  [-0.9, -0.9, 0.9, -0.9, 0.9, 0.9, -0.9, 0.9],
  [0, -1.2, 1.15, -0.4, 0.7, 1.0, -0.7, 1.0, -1.15, -0.4],
  [0.6, -1.05, 1.2, 0, 0.6, 1.05, -0.6, 1.05, -1.2, 0, -0.6, -1.05],
  [0, -1.2, 1.2, 0, 0, 1.2, -1.2, 0],
  [-0.6, -1.2, 0.6, -1.2, 0.6, 1.2, -0.6, 1.2],
  [-0.7, -0.9, 0.7, -0.9, 1.2, 0.9, -1.2, 0.9],
  [-0.5, -1.1, 0.5, -1.1, 1.1, -0.5, 1.1, 0.5, 0.5, 1.1, -0.5, 1.1, -1.1, 0.5, -1.1, -0.5],
  [-0.6, -1.1, 0.6, -1.1, 1.0, 0.2, 0.7, 1.1, -0.7, 1.1, -1.0, 0.2],
];

// Warm palette blob colors — harmonize with #9BB4C0, #E1D0B3, #A18D6D, #703B3B
export const BLOB_COLORS = [
  '#b8d0d8', // light blue-grey
  '#d4c4a8', // warm tan
  '#c8a8a8', // muted rose
  '#e8d8c0', // warm beige
  '#aac8d4', // medium blue-grey
  '#c0b09a', // warm brown (light)
  '#d8e8ec', // very light blue
  '#e0d0bc', // light sand
  '#b8c8b8', // muted sage
  '#d0c0e0', // soft lavender
];

export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getControlPoints(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  t: number
): number[] {
  const d01 = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  const d12 = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const fa = (t * d01) / (d01 + d12);
  const fb = (t * d12) / (d01 + d12);
  return [
    x1 - fa * (x2 - x0),
    y1 - fa * (y2 - y0),
    x1 + fb * (x2 - x0),
    y1 + fb * (y2 - y0),
  ];
}

function expandPoints(p: number[], tension: number): number[] {
  const len = p.length;
  const allPoints: number[] = [];
  for (let n = 2; n < len - 2; n += 2) {
    const cp = getControlPoints(p[n - 2], p[n - 1], p[n], p[n + 1], p[n + 2], p[n + 3], tension);
    if (isNaN(cp[0])) continue;
    allPoints.push(cp[0], cp[1], p[n], p[n + 1], cp[2], cp[3]);
  }
  return allPoints;
}

export function blobToSVGPath(points: number[], tension: number): string {
  const p = points;
  const len = p.length;
  if (len < 4) return '';

  const fc = getControlPoints(p[len - 2], p[len - 1], p[0], p[1], p[2], p[3], tension);
  const lc = getControlPoints(p[len - 4], p[len - 3], p[len - 2], p[len - 1], p[0], p[1], tension);
  const middle = expandPoints(p, tension);

  const tp = [
    fc[2], fc[3],
    ...middle,
    lc[0], lc[1],
    p[len - 2], p[len - 1],
    lc[2], lc[3],
    fc[0], fc[1],
    p[0], p[1],
  ];

  let d = `M ${p[0]} ${p[1]}`;
  for (let n = 0; n < tp.length - 2; n += 6) {
    d += ` C ${tp[n]} ${tp[n + 1]} ${tp[n + 2]} ${tp[n + 3]} ${tp[n + 4]} ${tp[n + 5]}`;
  }
  return d + ' Z';
}
