import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { setAvatarElement, setAvatarFrames } from '../../domains/avatar/engine';
import { AVATARS } from '../../domains/avatar/avatarConfig';
import type { Direction } from '../../domains/avatar/avatarConfig';

interface AvatarSpriteProps {
  initialX: number;
  initialY: number;
}

const AVATAR_SIZE = 40;
const DIRECTIONS: Direction[] = ['left', 'back', 'front', 'right'];
const WALK_FRAMES = [1, 2, 3] as const;

export function AvatarSprite({ initialX, initialY }: AvatarSpriteProps) {
  const groupRef = useRef<SVGGElement>(null);
  const imageRef = useRef<SVGImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const avatarId = useStore((s) => s.avatar.avatarId);
  const config = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];

  // Preload all 12 frames when avatar changes
  useEffect(() => {
    setLoaded(false);
    let remaining = DIRECTIONS.length * WALK_FRAMES.length;
    for (const dir of DIRECTIONS) {
      for (const frame of WALK_FRAMES) {
        const img = new window.Image();
        img.src = config.frameUrl(dir, frame);
        img.onload = img.onerror = () => {
          remaining--;
          if (remaining === 0) setLoaded(true);
        };
      }
    }
  }, [config]);

  // Register group element for position updates
  useEffect(() => {
    setAvatarElement(groupRef.current, initialX, initialY);
    return () => setAvatarElement(null);
  }, [initialX, initialY]);

  // Register image element for frame updates once loaded
  useEffect(() => {
    if (loaded) setAvatarFrames(imageRef.current, avatarId);
  }, [loaded, avatarId]);

  return (
    <g ref={groupRef} transform={`translate(${initialX}, ${initialY})`}>
      {loaded && (
        <image
          ref={imageRef}
          href={config.frameUrl('front', 1)}
          x={-AVATAR_SIZE / 2}
          y={-AVATAR_SIZE}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE * 2}
          style={{ filter: 'drop-shadow(0 0 5px rgba(112,59,59,0.7)) sepia(0.25) saturate(0.8)' }}
        />
      )}
    </g>
  );
}
