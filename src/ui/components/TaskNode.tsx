import { memo } from 'react';
import { computeNodeRadius } from '../../domains/board/layoutService';
import type { Task } from '../../domains/tasks/types';

interface TaskNodeProps {
  task: Task;
  isSelected: boolean;
  isNearby: boolean;
}

const BLOB_SHAPES: number[][] = [
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
const BLOB_COLORS = [
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

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Exact port of Konva's cardinal spline algorithm for closed shapes.
// Source: konva/lib/shapes/Line.js — getControlPoints + expandPoints + _getTensionPointsClosed
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

function blobToSVGPath(points: number[], tension: number): string {
  const p = points;
  const len = p.length;
  if (len < 4) return '';

  const fc = getControlPoints(p[len - 2], p[len - 1], p[0], p[1], p[2], p[3], tension);
  const lc = getControlPoints(p[len - 4], p[len - 3], p[len - 2], p[len - 1], p[0], p[1], tension);
  const middle = expandPoints(p, tension);

  // Matches Konva's _getTensionPointsClosed output structure
  const tp = [
    fc[2], fc[3],
    ...middle,
    lc[0], lc[1],
    p[len - 2], p[len - 1],
    lc[2], lc[3],
    fc[0], fc[1],
    p[0], p[1],
  ];

  // Matches Konva's _sceneFunc drawing loop for closed shapes: while (n < len - 2) bezierCurveTo(6 values)
  let d = `M ${p[0]} ${p[1]}`;
  for (let n = 0; n < tp.length - 2; n += 6) {
    d += ` C ${tp[n]} ${tp[n + 1]} ${tp[n + 2]} ${tp[n + 3]} ${tp[n + 4]} ${tp[n + 5]}`;
  }
  return d + ' Z';
}

export const TaskNode = memo(function TaskNode({ task, isSelected, isNearby }: TaskNodeProps) {
  if (!task.position) return null;
  const radius = computeNodeRadius(task.points);
  const isRequired = task.type === 'required';

  const hash = hashId(task.id);
  const shapeIndex = hash % BLOB_SHAPES.length;
  const colorIndex = ((hash >>> 8) ^ (hash >>> 16)) % BLOB_COLORS.length;

  const fill = BLOB_COLORS[colorIndex];
  const strokeColor = isSelected ? '#703B3B' : 'rgba(255,255,255,0.9)';
  const strokeWidth = isSelected ? 2.5 : isNearby ? 2 : 1.5;
  const shadowBlur = isSelected ? 18 : isNearby ? 10 : 5;

  const w = radius * 1.3;
  const h = radius * 0.9;

  const shapePoints = BLOB_SHAPES[shapeIndex];
  const scaledPoints: number[] = [];
  for (let i = 0; i < shapePoints.length; i += 2) {
    scaledPoints.push(shapePoints[i] * w, shapePoints[i + 1] * h);
  }

  const maxChars = Math.floor((w * 2) / 7.5);
  const label = task.title.length > maxChars ? task.title.slice(0, maxChars - 1) + '…' : task.title;

  const filterId = `ds-${task.id}`;
  const mainPath = blobToSVGPath(scaledPoints, 0.4);
  const glowPath = blobToSVGPath(scaledPoints.map(p => p * 1.15), 0.4);

  return (
    <g transform={`translate(${task.position.x}, ${task.position.y})`}>
      <defs>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation={shadowBlur} floodColor={fill} floodOpacity={0.4} />
        </filter>
      </defs>

      {/* Glow when nearby or selected */}
      {(isNearby || isSelected) && (
        <path d={glowPath} fill={fill} opacity={0.2} stroke="none" />
      )}

      {/* Main blob shape */}
      <path
        d={mainPath}
        fill={fill}
        stroke={strokeWidth > 0 ? strokeColor : 'none'}
        strokeWidth={strokeWidth}
        opacity={isRequired ? 1 : 0.88}
        filter={`url(#${filterId})`}
      />

      {/* Required indicator dot */}
      {isRequired && (
        <circle
          cx={w * 0.85}
          cy={-h * 0.5}
          r={5}
          fill="#703B3B"
          stroke="#fff"
          strokeWidth={1.5}
        />
      )}

      {/* Title */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={isRequired ? 'bold' : 'normal'}
        fill="#3d2020"
      >
        {label}
      </text>
    </g>
  );
});
