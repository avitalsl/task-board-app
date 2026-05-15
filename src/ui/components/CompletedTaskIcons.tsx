import { useStore } from '../../store';
import { BLOB_SHAPES, BLOB_COLORS, hashId, blobToSVGPath } from '../../domains/board/blobUtils';
import type { Task } from '../../domains/tasks/types';
import styles from './CompletedTaskIcons.module.css';

const ICON_SIZE = 28;
const HALF = ICON_SIZE / 2;
const W = HALF * 0.85;
const H = HALF * 0.75;

export function CompletedTaskIcons() {
  const tasks = useStore((s) => s.tasks);
  const period = useStore((s) => s.period);
  const settings = useStore((s) => s.settings);
  const presentation = useStore((s) => s.board.presentation);

  // In no_goal mode, show all completed tasks; otherwise show tasks completed during the current period.
  // Recurring tasks use completionCount so their icons persist after they reset to active.
  // Repeated completions of the same recurring task collapse into a single stacked indicator.
  const completedEntries: { task: Task; count: number }[] = [];
  for (const t of tasks) {
    if (t.lifecycleType === 'recurring') {
      const count = t.completionCount ?? 0;
      if (count > 0) completedEntries.push({ task: t, count });
    } else {
      if (!t.isCompleted || t.completedAt === null) continue;
      if (settings.mode !== 'no_goal' && period && t.completedAt < period.start) continue;
      completedEntries.push({ task: t, count: 1 });
    }
  }

  if (completedEntries.length === 0) return null;

  return (
    <div className={styles.container}>
      {completedEntries.map(({ task, count }) =>
        presentation === 'notes_rows' ? (
          <StickyNoteIndicator key={task.id} task={task} count={count} />
        ) : (
          <BlobIndicator key={task.id} task={task} count={count} />
        )
      )}
    </div>
  );
}

// Cap ghost peeks at 2 even when count is higher; tooltip still shows the real count.
const MAX_GHOSTS = 2;

function tooltipFor(title: string, count: number): string {
  return count > 1 ? `${title} × ${count}` : title;
}

function BlobIndicator({ task, count }: { task: Task; count: number }) {
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

  const ghostCount = Math.min(Math.max(count - 1, 0), MAX_GHOSTS);
  const ghostClasses = [styles.ghost1, styles.ghost2];

  const blobSvg = (className: string) => (
    <svg
      className={className}
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox={`${-HALF} ${-HALF} ${ICON_SIZE} ${ICON_SIZE}`}
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
  );

  return (
    <div className={styles.iconWrapper} data-tooltip={tooltipFor(task.title, count)}>
      <div className={styles.stack}>
        {Array.from({ length: ghostCount }, (_, i) => (
          <span key={i} className={`${styles.ghost} ${ghostClasses[i]}`}>
            {blobSvg(styles.icon)}
          </span>
        ))}
        {blobSvg(`${styles.icon} ${styles.topIcon}`)}
      </div>
    </div>
  );
}

function StickyNoteIndicator({ task, count }: { task: Task; count: number }) {
  const hash = hashId(task.id);
  const colorIdx = task.colorIndex !== undefined ? task.colorIndex : hash % 6;
  const colorClass = styles[`noteColor${colorIdx}` as keyof typeof styles];
  const tiltClass = styles[`noteTilt${hash % 4}` as keyof typeof styles];
  const isRequired = task.type === 'required';

  const ghostCount = Math.min(Math.max(count - 1, 0), MAX_GHOSTS);
  const ghostClasses = [styles.ghost1, styles.ghost2];

  return (
    <div className={styles.iconWrapper} data-tooltip={tooltipFor(task.title, count)}>
      <div className={styles.stack}>
        {Array.from({ length: ghostCount }, (_, i) => (
          <span key={i} className={`${styles.ghost} ${ghostClasses[i]}`}>
            <div className={`${styles.note} ${colorClass} ${tiltClass}`} />
          </span>
        ))}
        <div className={`${styles.note} ${styles.topNote} ${colorClass} ${tiltClass}`}>
          {isRequired && <span className={styles.requiredDot} />}
        </div>
      </div>
    </div>
  );
}
