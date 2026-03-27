import styles from './TaskActionMenu.module.css';

interface TaskActionMenuProps {
  taskPosition: { x: number; y: number };
  onComplete: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function TaskActionMenu({ taskPosition, onComplete, onEdit, onClose }: TaskActionMenuProps) {
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.buttons}
        style={{
          left: taskPosition.x - 30,
          top: taskPosition.y - 10,
        }}
      >
        <button className={styles.btnComplete} onClick={onComplete} title="Complete">
          ✓
        </button>
        <button className={styles.btnEdit} onClick={onEdit} title="Edit">
          ✎
        </button>
      </div>
    </>
  );
}
