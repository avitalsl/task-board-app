import { Group, Circle, Text } from 'react-konva';

interface AvatarSpriteProps {
  x: number;
  y: number;
  isMoving: boolean;
}

const AVATAR_RADIUS = 18;

export function AvatarSprite({ x, y, isMoving }: AvatarSpriteProps) {
  return (
    <Group x={x} y={y}>
      {/* Outer pulse ring when moving */}
      {isMoving && (
        <Circle
          radius={AVATAR_RADIUS + 8}
          fill="transparent"
          stroke="#eaeaea"
          strokeWidth={1}
          opacity={0.3}
        />
      )}

      {/* Body */}
      <Circle
        radius={AVATAR_RADIUS}
        fill="#0f3460"
        stroke="#eaeaea"
        strokeWidth={2}
        shadowColor="#eaeaea"
        shadowBlur={10}
        shadowOpacity={0.4}
      />

      {/* Icon */}
      <Text
        x={-AVATAR_RADIUS}
        y={-AVATAR_RADIUS + 4}
        width={AVATAR_RADIUS * 2}
        height={AVATAR_RADIUS * 2}
        text="⚔️"
        fontSize={14}
        align="center"
      />
    </Group>
  );
}
