import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { handleTaskComplete, clearSelection } from '../../application/taskActions';
import { getPermissions } from '../../domains/access/permissions';
import { editingTaskId } from '../components/BacklogEditState';
import { VoiceTaskModal } from '../components/VoiceTaskModal';
import boardStyles from './BoardScreen.module.css';
import styles from './NotesRowsBoardView.module.css';

export function NotesRowsBoardView() {
  const tasks = useStore((s) => s.tasks);
  const accessType = useStore((s) => s.ui.accessType);
  const permissions = getPermissions(accessType);
  const selectedTaskId = useStore((s) => s.avatar.selectedTaskId);
  const avatar = useStore((s) => s.avatar);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const activeTasks = tasks.filter((t) => t.isActive);
  // Single chokepoint for render order so a future per-presentation ordering
  // source (e.g. drag-and-drop reordering) can plug in without touching JSX.
  const orderedTasks = activeTasks;

  function selectTask(id: string) {
    if (selectedTaskId === id) {
      clearSelection();
      return;
    }
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: id });
  }

  function openEdit(id: string) {
    editingTaskId.value = id;
    clearSelection();
    useStore.getState().setUI({ activeScreen: 'backlog' });
  }

  return (
    <div className={styles.view} data-testid="notes-rows-board-view">
      {orderedTasks.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No active tasks</div>
          <div className={styles.emptySubtitle}>
            {permissions.canCreateTask
              ? 'Add one with the + button.'
              : 'Nothing to do right now.'}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {orderedTasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                type="button"
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                onClick={() => selectTask(task.id)}
              >
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${task.type === 'required' ? styles.badgeRequired : styles.badgeOptional}`}>
                    {task.type}
                  </span>
                  <span className={styles.badge}>{task.lifecycleType === 'recurring' ? '↺' : '1×'}</span>
                  <span className={styles.points}>{task.points}pts</span>
                </div>
                <div className={styles.title}>{task.title}</div>
                {task.description && <div className={styles.desc}>{task.description}</div>}
                {isSelected && (
                  <div className={styles.inlineActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.btnComplete}
                      onClick={() => handleTaskComplete(task.id)}
                    >
                      Complete
                    </button>
                    {permissions.canEditTask && (
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() => openEdit(task.id)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {permissions.canCreateTask && createPortal(
        <button
          className={boardStyles.fab}
          onClick={() => setVoiceModalOpen(true)}
          title="Add task by voice"
        >
          +
        </button>,
        document.body
      )}

      {voiceModalOpen && createPortal(
        <VoiceTaskModal onClose={() => setVoiceModalOpen(false)} />,
        document.body
      )}
    </div>
  );
}
