export type Direction = 'left' | 'back' | 'front' | 'right';

export interface AvatarConfig {
  id: string;
  label: string;
  frameUrl: (direction: Direction, walkFrame: 1 | 2 | 3) => string;
  previewUrl: string;
}

function makeFrameUrl(id: string) {
  return (direction: Direction, walkFrame: 1 | 2 | 3) =>
    `/avatars/${id}/${direction}-${walkFrame}.png`;
}

export const AVATARS: AvatarConfig[] = [
  { id: 'teal',  label: 'Scout',  frameUrl: makeFrameUrl('teal'),  previewUrl: '/avatars/teal/front-1.png' },
  { id: 'red',   label: 'Ranger', frameUrl: makeFrameUrl('red'),   previewUrl: '/avatars/red/front-1.png' },
  { id: 'elder', label: 'Elder',  frameUrl: makeFrameUrl('elder'), previewUrl: '/avatars/elder/front-1.png' },
  { id: 'girl',  label: 'Aria',   frameUrl: makeFrameUrl('girl'),  previewUrl: '/avatars/girl/front-1.png' },
];

export const DEFAULT_AVATAR_ID = 'teal';
