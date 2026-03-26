import { useStore } from '../../store';
import styles from './CompletedTaskIcons.module.css';

export function CompletedTaskIcons() {
  const tasks = useStore((s) => s.tasks);
  const period = useStore((s) => s.period);
  const settings = useStore((s) => s.settings);

  // In no_goal mode, show all completed tasks; otherwise show tasks completed during the current period
  const completedTasks = tasks.filter((t) => {
    if (!t.isCompleted || t.completedAt === null) return false;
    if (settings.mode === 'no_goal' || !period) return true;
    return t.completedAt >= period.start;
  });

  if (completedTasks.length === 0) return null;

  return (
    <div className={styles.container}>
      {completedTasks.map((task) => (
        <div
          key={task.id}
          className={`${styles.icon} ${task.type === 'required' ? styles.iconRequired : styles.iconOptional}`}
          title={`${task.title} (${task.points}pts)`}
        >
          <span className={styles.check}>✓</span>
        </div>
      ))}
    </div>
  );
}
