import { useStore } from '../../store';
import styles from './ProgressBar.module.css';

export function ProgressBar() {
  const settings = useStore((s) => s.settings);
  const scoring = useStore((s) => s.scoring);

  const isNoGoal = settings.mode === 'no_goal';
  const fill = isNoGoal
    ? 0
    : settings.targetScore > 0
      ? Math.min(scoring.currentPeriodScore / settings.targetScore, 1)
      : 0;

  const showRequired =
    !isNoGoal && (settings.goalType === 'required_tasks' || settings.goalType === 'combined');

  return (
    <div className={styles.container}>
      <div className={styles.barRow}>
        <div className={styles.barTrack}>
          {!isNoGoal && (
            <div
              className={styles.barFill}
              style={{ width: `${fill * 100}%` }}
            />
          )}
        </div>
        <span className={styles.scoreLabel}>
          {isNoGoal
            ? `${scoring.totalScore} pts`
            : `${scoring.currentPeriodScore} / ${settings.targetScore}`}
        </span>
      </div>

      {showRequired && (
        <span className={styles.requiredBadge}>
          {scoring.currentPeriodRequiredCompleted} / {settings.targetRequiredTaskCount} required
        </span>
      )}
    </div>
  );
}
