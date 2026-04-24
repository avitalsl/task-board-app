import { memo } from 'react';
import { computeNodeRadius } from '../../domains/board/layoutService';
import { BLOB_SHAPES, BLOB_COLORS, hashId, blobToSVGPath } from '../../domains/board/blobUtils';
import type { Task } from '../../domains/tasks/types';
import { growthMinutes } from '../../domains/tasks/types';

interface TaskNodeProps {
  task: Task;
  isSelected: boolean;
  isNearby: boolean;
}

export const TaskNode = memo(function TaskNode({ task, isSelected, isNearby }: TaskNodeProps) {
  if (!task.position) return null;
  const radius = computeNodeRadius(growthMinutes(task));
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
