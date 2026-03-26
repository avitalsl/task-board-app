export interface AvatarState {
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  isMoving: boolean;
  selectedTaskId: string | null;
}

export const DEFAULT_AVATAR_STATE: AvatarState = {
  position: { x: 200, y: 200 },
  targetPosition: null,
  isMoving: false,
  selectedTaskId: null,
};
