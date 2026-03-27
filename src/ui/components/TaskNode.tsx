import { memo } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { computeNodeRadius } from '../../domains/board/layoutService';
import type { Task } from '../../domains/tasks/types';

interface TaskNodeProps {
  task: Task;
  isSelected: boolean;
  isNearby: boolean;
}

// 10 distinct shapes — normalized (x, y) points, rendered with tension for smooth curves
const BLOB_SHAPES: number[][] = [
  // 1: Triangle (pointing up)
  [0, -1.3, 1.1, 0.8, -1.1, 0.8],
  // 2: Wide rectangle
  [-1.2, -0.6, 1.2, -0.6, 1.2, 0.6, -1.2, 0.6],
  // 3: Square
  [-0.9, -0.9, 0.9, -0.9, 0.9, 0.9, -0.9, 0.9],
  // 4: Pentagon
  [0, -1.2, 1.15, -0.4, 0.7, 1.0, -0.7, 1.0, -1.15, -0.4],
  // 5: Hexagon
  [0.6, -1.05, 1.2, 0, 0.6, 1.05, -0.6, 1.05, -1.2, 0, -0.6, -1.05],
  // 6: Diamond
  [0, -1.2, 1.2, 0, 0, 1.2, -1.2, 0],
  // 7: Tall pill
  [-0.6, -1.2, 0.6, -1.2, 0.6, 1.2, -0.6, 1.2],
  // 8: Trapezoid (wider bottom)
  [-0.7, -0.9, 0.7, -0.9, 1.2, 0.9, -1.2, 0.9],
  // 9: Octagon
  [-0.5, -1.1, 0.5, -1.1, 1.1, -0.5, 1.1, 0.5, 0.5, 1.1, -0.5, 1.1, -1.1, 0.5, -1.1, -0.5],
  // 10: Egg (wider at bottom)
  [-0.6, -1.1, 0.6, -1.1, 1.0, 0.2, 0.7, 1.1, -0.7, 1.1, -1.0, 0.2],
];

// Pastel colors that work on dark backgrounds
const BLOB_COLORS = [
  '#e8707e', // coral pink
  '#c4d45e', // lime green
  '#e8a0b4', // soft pink
  '#eda653', // orange
  '#5eb8a8', // teal
  '#e8d45e', // yellow
  '#8e9fd4', // periwinkle
  '#b49dd4', // lavender
  '#7ec8c0', // mint
  '#d4856e', // terracotta
];

// FNV-1a hash — spreads well even for similar nanoid strings
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const TaskNode = memo(function TaskNode({ task, isSelected, isNearby }: TaskNodeProps) {
  const radius = computeNodeRadius(task.points);
  const isRequired = task.type === 'required';

  const hash = hashId(task.id);
  const shapeIndex = hash % BLOB_SHAPES.length;
  const colorIndex = ((hash >>> 8) ^ (hash >>> 16)) % BLOB_COLORS.length;

  const fill = BLOB_COLORS[colorIndex];
  const strokeColor = isSelected ? '#fffbe6' : 'rgba(255,255,255,0.15)';
  const strokeWidth = isSelected ? 2.5 : isNearby ? 2 : 0;

  // Scale blob: wider than tall
  const w = radius * 1.3;
  const h = radius * 0.9;

  const shapePoints = BLOB_SHAPES[shapeIndex];
  const scaledPoints: number[] = [];
  for (let i = 0; i < shapePoints.length; i += 2) {
    scaledPoints.push(shapePoints[i] * w, shapePoints[i + 1] * h);
  }

  // Truncate title to fit
  const maxChars = Math.floor((w * 2) / 7.5);
  const label = task.title.length > maxChars ? task.title.slice(0, maxChars - 1) + '…' : task.title;

  return (
    <Group x={task.position.x} y={task.position.y}>
      {/* Glow when nearby or selected */}
      {(isNearby || isSelected) && (
        <Line
          points={scaledPoints.map((p) => p * 1.15)}
          closed
          tension={0.4}
          fill={fill}
          opacity={0.2}
        />
      )}

      {/* Main blob shape */}
      <Line
        points={scaledPoints}
        closed
        tension={0.4}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={isRequired ? 1 : 0.8}
        shadowColor={fill}
        shadowBlur={isSelected ? 18 : isNearby ? 10 : 5}
        shadowOpacity={0.4}
      />

      {/* Required indicator dot */}
      {isRequired && (
        <Circle
          x={w * 0.85}
          y={-h * 0.5}
          radius={5}
          fill="#ff4466"
          stroke="#fff"
          strokeWidth={1.5}
        />
      )}

      {/* Points badge */}
      <Circle
        x={w * 0.75}
        y={-h * 0.65}
        radius={10}
        fill="rgba(28, 23, 41, 0.85)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />
      <Text
        x={w * 0.75 - 10}
        y={-h * 0.65 - 6}
        width={20}
        height={12}
        text={String(task.points)}
        fontSize={9}
        fontStyle="bold"
        fill="#ede9f6"
        align="center"
      />

      {/* Title */}
      <Text
        x={-w}
        y={-7}
        width={w * 2}
        height={14}
        text={label}
        fontSize={12}
        fontStyle={isRequired ? 'bold' : 'normal'}
        fill="#1c1729"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
});
