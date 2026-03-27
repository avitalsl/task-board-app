export interface AvatarState {
  position: { x: number; y: number };
  selectedTaskId: string | null;
}

export const DEFAULT_AVATAR_STATE: AvatarState = {
  position: { x: 200, y: 200 },
  selectedTaskId: null,
};
