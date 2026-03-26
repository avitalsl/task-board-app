export interface ScoreState {
  totalScore: number;
  currentPeriodScore: number;
  currentPeriodRequiredCompleted: number;
}

export const DEFAULT_SCORE_STATE: ScoreState = {
  totalScore: 0,
  currentPeriodScore: 0,
  currentPeriodRequiredCompleted: 0,
};
