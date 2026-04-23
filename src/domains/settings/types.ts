import { DEFAULT_BOARD_ID } from '../board/constants';

export type GoalMode = 'no_goal' | 'daily' | 'weekly' | 'unlimited';
export type GoalType = 'points' | 'required_tasks' | 'combined';

export interface Settings {
  boardId?: string;
  mode: GoalMode;
  targetScore: number;
  targetRequiredTaskCount: number;
  goalType: GoalType;
  bonusMultiplier: number;
  resetHour: number;
}

export const DEFAULT_SETTINGS: Settings = {
  boardId: DEFAULT_BOARD_ID,
  mode: 'no_goal',
  targetScore: 100,
  targetRequiredTaskCount: 3,
  goalType: 'points',
  bonusMultiplier: 1.5,
  resetHour: 22,
};
