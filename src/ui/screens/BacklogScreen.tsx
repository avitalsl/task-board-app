import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { createTask, editTask, deleteTask, duplicateTask } from '../../domains/tasks/service';
import { getBoardPermissions } from '../../domains/board/boardPolicy';
import { parseTaskFromText } from '../../domains/ai/service';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { editingTaskId } from '../components/BacklogEditState';
import type { Task, TaskType, LifecycleType } from '../../domains/tasks/types';
import styles from './BacklogScreen.module.css';

interface TaskFormData {
  title: string;
  description: string;
  points: number;
  type: TaskType;
  lifecycleType: LifecycleType;
}

const EMPTY_FORM: TaskFormData = {
  title: '',
  description: '',
  points: 10,
  type: 'optional',
  lifecycleType: 'recurring',
};

export function BacklogScreen() {
  const tasks = useStore((s) => s.tasks);
  const boardMode = useStore((s) => s.board.mode);
  const permissions = getBoardPermissions(boardMode);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const voice = useVoiceInput();

  // Check if we were sent here from the board to edit a specific task
  useEffect(() => {
    if (editingTaskId.value) {
      const task = tasks.find((t) => t.id === editingTaskId.value);
      if (task) {
        openEdit(task);
      }
      editingTaskId.value = null;
    }
  }, []);

  // When voice transcript arrives, feed it into AI
  useEffect(() => {
    if (voice.transcript) {
      setAiInput(voice.transcript);
      (async () => {
        setAiLoading(true);
        setAiError(null);
        const result = await parseTaskFromText(voice.transcript!);
        setAiLoading(false);
        if (result.success && result.task) {
          createTask({ ...result.task, lifecycleType: 'recurring' });
          setAiInput('');
        } else {
          setAiError(result.error ?? 'Unknown error');
        }
      })();
    }
  }, [voice.transcript]);

  // Show voice errors
  useEffect(() => {
    if (voice.error) setAiError(voice.error);
  }, [voice.error]);

  const activeTasks = tasks.filter((t) => t.isActive);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      points: task.points,
      type: task.type,
      lifecycleType: task.lifecycleType,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingId) {
      editTask(editingId, form);
    } else {
      createTask(form);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleAiCreate() {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    const result = await parseTaskFromText(aiInput);
    setAiLoading(false);
    if (result.success && result.task) {
      createTask({ ...result.task, lifecycleType: 'recurring' });
      setAiInput('');
    } else {
      setAiError(result.error ?? 'Unknown error');
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // Render the edit form inline — either at the top (new task) or next to the task being edited
  const editForm = showForm ? (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3>{editingId ? 'Edit Task' : 'New Task'}</h3>
      <label>
        Title
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Task title"
          autoFocus
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
          rows={2}
        />
      </label>
      <div className={styles.row}>
        <label>
          Points
          <input
            type="number"
            min={1}
            max={999}
            value={form.points}
            onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
          />
        </label>
        <label>
          Type
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
          >
            <option value="optional">Optional</option>
            <option value="required">Required</option>
          </select>
        </label>
        <label>
          Lifecycle
          <select
            value={form.lifecycleType}
            onChange={(e) => setForm({ ...form, lifecycleType: e.target.value as LifecycleType })}
          >
            <option value="recurring">Recurring</option>
            <option value="one_time">One-time</option>
          </select>
        </label>
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary}>
          {editingId ? 'Save' : 'Create'}
        </button>
        <button type="button" className={styles.btnGhost} onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  ) : null;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h2>Backlog</h2>
        {permissions.canCreateTask && (
          <button className={styles.btnPrimary} onClick={openCreate}>+ New Task</button>
        )}
      </div>

      {permissions.canCreateTask && (
        <div className={styles.aiRow}>
          <input
            className={styles.aiInput}
            placeholder="Describe a task in natural language..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiCreate()}
            disabled={aiLoading}
          />
          <button
            className={styles.btnSecondary}
            onClick={handleAiCreate}
            disabled={aiLoading || !aiInput.trim()}
          >
            {aiLoading ? 'Creating...' : 'Create with AI'}
          </button>
          <button
            className={`${styles.btnMic} ${voice.isListening ? styles.btnMicActive : ''}`}
            onClick={voice.isListening ? voice.stop : voice.start}
            disabled={aiLoading}
            title={voice.isListening ? 'Stop recording' : 'Speak a task'}
          >
            🎤
          </button>
        </div>
      )}
      {aiError && (
        <div className={styles.aiError}>
          {aiError}
          <button className={styles.btnGhost} onClick={() => setAiError(null)}>Dismiss</button>
        </div>
      )}

      {/* Show form at top when creating a new task */}
      {showForm && !editingId && editForm}

      <section>
        <h3 className={styles.sectionTitle}>Active ({activeTasks.length})</h3>
        {activeTasks.length === 0 && (
          <p className={styles.empty}>No active tasks. Create one above.</p>
        )}
        <ul className={styles.taskList}>
          {activeTasks.map((task) => (
            <li key={task.id}>
              {/* Show inline edit form right above the task being edited */}
              {showForm && editingId === task.id && editForm}
              {(!showForm || editingId !== task.id) && (
                <TaskRow
                  task={task}
                  onEdit={openEdit}
                  onDuplicate={duplicateTask}
                  canEdit={permissions.canEditTask}
                  canDelete={permissions.canDeleteTask}
                  canDuplicate={permissions.canDuplicateTask}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {completedTasks.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle}>Completed ({completedTasks.length})</h3>
          <ul className={styles.taskList}>
            {completedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={openEdit}
                onDuplicate={duplicateTask}
                canEdit={permissions.canEditTask}
                canDelete={permissions.canDeleteTask}
                canDuplicate={permissions.canDuplicateTask}
                completed
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onEdit,
  onDuplicate,
  canEdit = true,
  canDelete = true,
  canDuplicate = true,
  completed = false,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canDuplicate?: boolean;
  completed?: boolean;
}) {
  const hasActions = !completed && (canEdit || canDuplicate || canDelete);
  return (
    <div className={`${styles.taskRow} ${completed ? styles.taskRowCompleted : ''}`}>
      <div className={styles.taskMeta}>
        <span className={`${styles.badge} ${task.type === 'required' ? styles.badgeRequired : styles.badgeOptional}`}>
          {task.type}
        </span>
        <span className={styles.badge}>{task.lifecycleType === 'recurring' ? '↺' : '1×'}</span>
        <span className={styles.points}>{task.points}pts</span>
      </div>
      <div className={styles.taskTitle}>{task.title}</div>
      {task.description && <div className={styles.taskDesc}>{task.description}</div>}
      {hasActions && (
        <div className={styles.taskActions}>
          {canEdit && <button className={styles.btnGhost} onClick={() => onEdit(task)}>Edit</button>}
          {canDuplicate && <button className={styles.btnGhost} onClick={() => onDuplicate(task.id)}>Duplicate</button>}
          {canDelete && <button className={styles.btnDanger} onClick={() => deleteTask(task.id)}>Delete</button>}
        </div>
      )}
    </div>
  );
}
