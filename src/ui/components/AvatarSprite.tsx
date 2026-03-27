import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { setAvatarNode } from '../../domains/avatar/engine';

interface AvatarSpriteProps {
  initialX: number;
  initialY: number;
}

const AVATAR_SIZE = 40;

export function AvatarSprite({ initialX, initialY }: AvatarSpriteProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = '/avatar.png';
    img.onload = () => setImage(img);
  }, []);

  // Register the Konva node with the engine
  useEffect(() => {
    setAvatarNode(groupRef.current);
    return () => setAvatarNode(null);
  }, []);

  return (
    <Group ref={groupRef} x={initialX} y={initialY}>
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
