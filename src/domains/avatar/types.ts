import { DEFAULT_AVATAR_ID } from './avatarConfig';

export interface AvatarState {
  position: { x: number; y: number };
  selectedTaskId: string | null;
  avatarId: string;
}

export const DEFAULT_AVATAR_STATE: AvatarState = {
  position: { x: 200, y: 200 },
  selectedTaskId: null,
  avatarId: DEFAULT_AVATAR_ID,
};
