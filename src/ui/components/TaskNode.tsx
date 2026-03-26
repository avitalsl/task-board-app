import { Group, Circle, Text } from 'react-konva';
import { computeNodeRadius } from '../../domains/board/layoutService';
import type { Task } from '../../domains/tasks/types';

interface TaskNodeProps {
  task: Task;
  isSelected: boolean;
  isNearby: boolean;
}

const REQUIRED_FILL = '#e94560';
const OPTIONAL_FILL = '#533483';
const REQUIRED_STROKE = '#ff6b87';
const OPTIONAL_STROKE = '#7c5cbf';
const SELECTED_STROKE = '#ffffff';

export function TaskNode({ task, isSelected, isNearby }: TaskNodeProps) {
  const radius = computeNodeRadius(task.points);
  const isRequired = task.type === 'required';

  const fill = isRequired ? REQUIRED_FILL : OPTIONAL_FILL;
  const stroke = isSelected ? SELECTED_STROKE : isRequired ? REQUIRED_STROKE : OPTIONAL_STROKE;
  const strokeWidth = isSelected ? 3 : isNearby ? 2.5 : 1.5;
  const glowRadius = isNearby || isSelected ? radius + 10 : 0;

  // Truncate title to fit inside circle
  const maxChars = Math.floor(radius / 5.5);
  const label = task.title.length > maxChars ? task.title.slice(0, maxChars - 1) + '…' : task.title;

  return (
    <Group x={task.position.x} y={task.position.y}>
      {/* Glow ring when nearby or selected */}
      {(isNearby || isSelected) && (
        <Circle
          radius={glowRadius}
          fill={fill}
          opacity={0.18}
        />
      )}

      {/* Main circle */}
      <Circle
        radius={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={isRequired ? 1 : 0.85}
        shadowColor={fill}
        shadowBlur={isSelected ? 20 : isNearby ? 12 : 6}
        shadowOpacity={0.5}
      />

      {/* Points badge */}
      <Circle
        x={radius * 0.65}
        y={-radius * 0.65}
        radius={10}
        fill="#1a1a2e"
        stroke={stroke}
        strokeWidth={1}
      />
      <Text
        x={radius * 0.65 - 10}
        y={-radius * 0.65 - 6}
        width={20}
        height={12}
        text={String(task.points)}
        fontSize={9}
        fontStyle="bold"
        fill="#eaeaea"
        align="center"
      />

      {/* Title */}
      <Text
        x={-radius}
        y={-7}
        width={radius * 2}
        height={14}
        text={label}
        fontSize={11}
        fontStyle={isRequired ? 'bold' : 'normal'}
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}
