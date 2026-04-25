import { addPoints } from '../domains/scoring/service';
import { completeTask, reactivateRecurringTask } from '../domains/tasks/service';
import { clearSelection } from '../domains/board/boardLogicService';
import { storePort } from './storePort';
import { useStore } from '../store';
import { completeTaskViaToken } from '../api/boardClient';

// Hold a completed recurring task in its inactive state briefly so the
// completion is visible to the user before it reappears. In notes_rows the
// presentation supplies its own exit/enter animation; in spatial/blob view
// this hold *is* the completion feedback (the blob disappears, then comes
// back). Keep long enough for the blob view to register, short enough that
// the notes_rows gap between exit and entry doesn't drag.
const RECURRING_RESET_DELAY_MS = 300;

/**
 * Handles task completion for both the owner and shared recipients.
 *
 * Owner path: updates local state directly (backend sync happens via subscription).
 * Token-user path: calls the backend API first, then updates local state on success.
 *   The backend enforces that only the task-complete action is permitted for token users.
 *
 * @temporary The token-user path is part of the temporary MVP access model.
 */
export function handleTaskComplete(taskId: string): void {
  const task = storePort.getTask(taskId);
  if (!task || task.isCompleted) return;

  const { accessType, shareToken } = useStore.getState().ui;

  if (accessType === 'complete_only_link') {
    if (!shareToken) return;
    completeTaskViaToken(shareToken, taskId)
      .then(() => {
        addPoints(task);
        completeTask(taskId);
        clearSelection();
      })
      .catch((err: unknown) => {
        console.error('Task completion failed:', err);
      });
    return;
  }

  // Owner: update local state (backend sync handled by the store subscription).
  addPoints(task);
  completeTask(taskId);
  clearSelection();

  if (task.lifecycleType === 'recurring') {
    setTimeout(() => reactivateRecurringTask(taskId), RECURRING_RESET_DELAY_MS);
  }
}

export { clearSelection } from '../domains/board/boardLogicService';
