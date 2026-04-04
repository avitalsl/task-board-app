import { useEffect, useRef, useState } from 'react';
import { setAvatarElement } from '../../domains/avatar/engine';

interface AvatarSpriteProps {
  initialX: number;
  initialY: number;
}

const AVATAR_SIZE = 40;

export function AvatarSprite({ initialX, initialY }: AvatarSpriteProps) {
  const groupRef = useRef<SVGGElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.src = '/avatar.png';
    img.onload = () => setLoaded(true);
  }, []);

  useEffect(() => {
    setAvatarElement(groupRef.current, initialX, initialY);
    return () => setAvatarElement(null);
  }, [initialX, initialY]);

  return (
    <g ref={groupRef} transform={`translate(${initialX}, ${initialY})`}>
      {loaded && (
        <image
          href="/avatar.png"
          x={-AVATAR_SIZE / 2}
          y={-AVATAR_SIZE / 2}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          style={{ filter: 'drop-shadow(0 0 4px rgba(124,77,255,1))' }}
        />
      )}
    </g>
  );
}
