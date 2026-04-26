import { useStore } from '../../store';
import styles from './ProgressBar.module.css';

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  const rounded = Math.round(hours * 2) / 2; // round to nearest 0.5
  return `${rounded} h`;
}

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
            ? formatHours(scoring.totalScore)
            : `${formatHours(scoring.currentPeriodScore)} / ${formatHours(settings.targetScore)}`}
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
