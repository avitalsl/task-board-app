import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { handleTaskComplete, clearSelection } from '../../application/taskActions';
import { getPermissions } from '../../domains/access/permissions';
import { hashId } from '../../domains/board/blobUtils';
import { formatTimeMinutes } from '../../domains/tasks/types';
import { editingTaskId } from '../components/BacklogEditState';
import { VoiceTaskModal } from '../components/VoiceTaskModal';
import boardStyles from './BoardScreen.module.css';
import styles from './NotesRowsBoardView.module.css';

const MOBILE_QUERY = '(max-width: 600px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function NotesRowsBoardView() {
  const tasks = useStore((s) => s.tasks);
  const accessType = useStore((s) => s.ui.accessType);
  const permissions = getPermissions(accessType);
  const selectedTaskId = useStore((s) => s.avatar.selectedTaskId);
  const avatar = useStore((s) => s.avatar);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const activeTasks = tasks.filter((t) => t.isActive);
  // Single chokepoint for render order so a future per-presentation ordering
  // source (e.g. drag-and-drop reordering) can plug in without touching JSX.
  const orderedTasks = activeTasks;

  function openCard(id: string) {
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: id });
  }

  // On mobile: first tap opens a collapsed note; tapping inside the opened
  // note body is a no-op; tapping a different note only closes the open one
  // (does not switch in a single tap). On desktop: click toggles.
  function handleCardClick(id: string) {
    if (isMobile) {
      if (selectedTaskId && selectedTaskId !== id) {
        clearSelection();
        return;
      }
      if (selectedTaskId === id) return;
      openCard(id);
      return;
    }
    if (selectedTaskId === id) {
      clearSelection();
      return;
    }
    openCard(id);
  }

  // Mobile only: a tap on the view's empty area (outside any note card)
  // closes the currently opened note.
  function handleViewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isMobile || !selectedTaskId) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-note-card]')) return;
    clearSelection();
  }

  function openEdit(id: string) {
    editingTaskId.value = id;
    clearSelection();
    useStore.getState().setUI({ activeScreen: 'backlog' });
  }

  return (
    <div
      className={styles.view}
      data-testid="notes-rows-board-view"
      onClick={handleViewClick}
    >
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
            const h = hashId(task.id);
            const colorClass = styles[`cardColor${h % 6}` as keyof typeof styles];
            const tiltClass = styles[`cardTilt${h % 4}` as keyof typeof styles];
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                data-note-card="true"
                className={`${styles.card} ${colorClass} ${tiltClass} ${isSelected ? styles.cardSelected : ''}`}
                onClick={() => handleCardClick(task.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(task.id); } }}
              >
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${task.type === 'required' ? styles.badgeRequired : styles.badgeOptional}`}>
                    {task.type}
                  </span>
                  <span className={styles.badge}>{task.lifecycleType === 'recurring' ? '↺' : '1×'}</span>
                  <span className={styles.value}>
                    <span className={styles.valuePrimary}>{formatTimeMinutes(task.baseTimeMinutes)}</span>
                    {task.difficultyMultiplier > 1 && (
                      <span
                        className={styles.multiplierChip}
                        title={`Difficulty ×${task.difficultyMultiplier}`}
                      >
                        ×{task.difficultyMultiplier}
                      </span>
                    )}
                  </span>
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
              </div>
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
