import { useStore } from '../../store';
import { BLOB_SHAPES, BLOB_COLORS, hashId, blobToSVGPath } from '../../domains/board/blobUtils';
import styles from './CompletedTaskIcons.module.css';

const ICON_SIZE = 28;
const HALF = ICON_SIZE / 2;
const W = HALF * 0.85;
const H = HALF * 0.75;

export function CompletedTaskIcons() {
  const tasks = useStore((s) => s.tasks);
  const period = useStore((s) => s.period);
  const settings = useStore((s) => s.settings);

  // In no_goal mode, show all completed tasks; otherwise show tasks completed during the current period.
  // Recurring tasks use completionCount so their icons persist after they reset to active.
  const completedEntries: { task: typeof tasks[number]; key: string }[] = [];
  for (const t of tasks) {
    if (t.lifecycleType === 'recurring') {
      const count = t.completionCount ?? 0;
      for (let i = 0; i < count; i++) {
        completedEntries.push({ task: t, key: `${t.id}-${i}` });
      }
    } else {
      if (!t.isCompleted || t.completedAt === null) continue;
      if (settings.mode !== 'no_goal' && period && t.completedAt < period.start) continue;
      completedEntries.push({ task: t, key: t.id });
    }
  }

  if (completedEntries.length === 0) return null;

  return (
    <div className={styles.container}>
      {completedEntries.map(({ task, key }) => {
        const hash = hashId(task.id);
        const shapeIndex = hash % BLOB_SHAPES.length;
        const colorIndex = ((hash >>> 8) ^ (hash >>> 16)) % BLOB_COLORS.length;
        const fill = BLOB_COLORS[colorIndex];
        const isRequired = task.type === 'required';

        const shapePoints = BLOB_SHAPES[shapeIndex];
        const scaledPoints: number[] = [];
        for (let i = 0; i < shapePoints.length; i += 2) {
          scaledPoints.push(shapePoints[i] * W, shapePoints[i + 1] * H);
        }
        const mainPath = blobToSVGPath(scaledPoints, 0.4);

        return (
          <div key={key} className={styles.iconWrapper} data-tooltip={task.title}>
            <svg
              width={ICON_SIZE}
              height={ICON_SIZE}
              viewBox={`${-HALF} ${-HALF} ${ICON_SIZE} ${ICON_SIZE}`}
              className={styles.icon}
            >
              <path
                d={mainPath}
                fill={fill}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={1}
                opacity={isRequired ? 1 : 0.88}
              />
              {isRequired && (
                <circle
                  cx={W * 0.85}
                  cy={-H * 0.5}
                  r={2.5}
                  fill="#703B3B"
                  stroke="#fff"
                  strokeWidth={0.8}
                />
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
