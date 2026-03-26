import { useEffect, useState } from 'react';
import { Group, Circle, Image as KonvaImage } from 'react-konva';

interface AvatarSpriteProps {
  x: number;
  y: number;
  isMoving: boolean;
}

const AVATAR_SIZE = 40;

export function AvatarSprite({ x, y, isMoving }: AvatarSpriteProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = '/avatar.png';
    img.onload = () => setImage(img);
  }, []);

  return (
    <Group x={x} y={y}>
      {/* Avatar image with colored border glow */}
      {image && (
        <KonvaImage
          image={image}
          x={-AVATAR_SIZE / 2}
          y={-AVATAR_SIZE / 2}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          shadowColor="#7c4dff"
          shadowBlur={4}
          shadowOpacity={1}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
      )}
    </Group>
  );
}
