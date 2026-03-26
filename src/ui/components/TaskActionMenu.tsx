import type { Task } from '../../domains/tasks/types';
import styles from './TaskActionMenu.module.css';

interface TaskActionMenuProps {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

export function TaskActionMenu({ task, onComplete, onClose }: TaskActionMenuProps) {
  return (
    <div className={styles.menu}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${task.type === 'required' ? styles.badgeRequired : styles.badgeOptional}`}>
          {task.type}
        </span>
        <span className={styles.title}>{task.title}</span>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>
      {task.description && <p className={styles.desc}>{task.description}</p>}
      <div className={styles.info}>
        <span>{task.points} pts</span>
        <span>{task.lifecycleType === 'recurring' ? 'Recurring' : 'One-time'}</span>
      </div>
      <button className={styles.completeBtn} onClick={onComplete}>
        Complete Task
      </button>
    </div>
  );
}
