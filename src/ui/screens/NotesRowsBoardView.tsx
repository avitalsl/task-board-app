import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { handleTaskComplete, clearSelection } from '../../application/taskActions';
import { getPermissions } from '../../domains/access/permissions';
import { hashId } from '../../domains/board/blobUtils';
import {
  applyNotesOrder,
  reconcileOrder,
  setNotesOrder,
} from '../../domains/board/notesRowsLayoutService';
import { formatTimeMinutes } from '../../domains/tasks/types';
import type { Task } from '../../domains/tasks/types';
import { editingTaskId } from '../components/BacklogEditState';
import { VoiceTaskModal } from '../components/VoiceTaskModal';
import boardStyles from './BoardScreen.module.css';
import styles from './NotesRowsBoardView.module.css';

const MOBILE_QUERY = '(max-width: 600px)';

// Recurring-task completion choreography in notes_rows:
//   exiting → gap → entering
// 'gap' is a bridge state: when the reactivation fires (isActive flips true),
// the useEffect checks for 'gap' specifically and promotes to 'entering'. This
// means reactivation arriving while still in 'exiting' is safe — it's ignored
// until the exit timeout sets 'gap', which then immediately triggers entry.
type CompletionPhase = 'exiting' | 'gap' | 'entering';
const EXIT_MS = 360;
const ENTRY_MS = 320;

// Drag activation thresholds. Mouse drag starts on a small movement; touch
// requires a brief hold so plain taps still open the note and vertical
// scrolls still scroll the page naturally.
const DRAG_MOVE_THRESHOLD_PX = 6;
// Touch-only: how far the finger may drift during the press-and-hold before
// we treat the gesture as a scroll and abort. Generous because finger tremor
// on a phone (especially when reaching to the top/bottom of the screen) easily
// drifts ~5–10px even when the user thinks they're holding still.
const TOUCH_SCROLL_THRESHOLD_PX = 14;
const TOUCH_HOLD_MS = 250;

type DragState = {
  id: string;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  cardWidth: number;
  cardHeight: number;
  currentX: number;
  currentY: number;
  active: boolean;
  // Snapshot of the visual id order at the moment the drag started. Used as
  // the baseline for reorder preview so hitTestAndPreview has no stale-closure
  // dependency on the live orderedTasks memo.
  initialOrderIds: string[];
};

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
  const persistedNotesOrder = useStore(
    (s) => s.board.layouts?.notes_rows?.order
  );
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const [phaseMap, setPhaseMap] = useState<Record<string, CompletionPhase>>({});
  const timeoutsRef = useRef<Set<number>>(new Set());

  useEffect(() => () => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current.clear();
  }, []);

  function setPhase(id: string, phase: CompletionPhase | null) {
    setPhaseMap((prev) => {
      if (phase === null) {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: phase };
    });
  }

  function schedule(fn: () => void, ms: number) {
    const handle = window.setTimeout(() => {
      timeoutsRef.current.delete(handle);
      fn();
    }, ms);
    timeoutsRef.current.add(handle);
  }

  useEffect(() => {
    for (const t of tasks) {
      if (t.isActive && phaseMap[t.id] === 'gap') {
        setPhase(t.id, 'entering');
        schedule(() => setPhase(t.id, null), ENTRY_MS);
      }
    }
  }, [tasks, phaseMap]);

  function completeTaskWithChoreography(id: string) {
    if (tasks.find((t) => t.id === id)?.lifecycleType === 'recurring') {
      setPhase(id, 'exiting');
      schedule(() => setPhase(id, 'gap'), EXIT_MS);
    }
    handleTaskComplete(id);
  }

  // Keep recurring tasks rendered through their completion → reactivation
  // window so the back stack layers stay visible the whole time. Without this
  // the slot would unmount the moment isActive flips to false and the stack
  // would visibly disappear before re-mounting.
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.isActive || phaseMap[t.id] !== undefined),
    [tasks, phaseMap]
  );

  // === Drag and drop ===
  // Reordering writes to board.layouts.notes_rows.order, which becomes the
  // source of truth once any drag has happened. Until then the renderer falls
  // back to the natural tasks[] order (see applyNotesOrder).
  const canReorder = permissions.canEditTask;
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[] | null>(null);
  // Refs mirror state so window-level event handlers always see the current
  // value without triggering effect re-registration. Updated inline alongside
  // every setState call (no sync effects needed).
  const dragStateRef = useRef<DragState | null>(null);
  const previewOrderRef = useRef<string[] | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const holdTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const orderedTasks = useMemo(() => {
    const order = previewOrder ?? persistedNotesOrder ?? [];
    return applyNotesOrder(visibleTasks, order);
  }, [visibleTasks, previewOrder, persistedNotesOrder]);

  function setCardRef(id: string, el: HTMLDivElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  const cancelHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const activateDrag = useCallback(() => {
    setDragState((prev) => {
      if (!prev || prev.active) return prev;
      const next = { ...prev, active: true };
      dragStateRef.current = next;
      return next;
    });
  }, []);

  const resetDragState = useCallback(() => {
    setDragState(null);
    dragStateRef.current = null;
    setPreviewOrder(null);
    previewOrderRef.current = null;
  }, []);

  // Hit-test pointer against (non-dragged) card rects; on a hit, slide the
  // dragged id into that card's slot. Uses the initial order snapshot stored
  // in DragState so this callback has no dependencies that change during drag.
  const hitTestAndPreview = useCallback((x: number, y: number, draggedId: string) => {
    let overId: string | null = null;
    for (const [id, el] of cardRefs.current) {
      if (id === draggedId || !el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        overId = id;
        break;
      }
    }
    if (!overId) return;
    setPreviewOrder((prev) => {
      const baseIds = prev ?? dragStateRef.current?.initialOrderIds ?? [];
      const fromIdx = baseIds.indexOf(draggedId);
      const toIdx = baseIds.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const next = [...baseIds];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      previewOrderRef.current = next;
      return next;
    });
  }, []);

  // Window-level pointer tracking so the drag survives the dragged card being
  // moved into a portal (out of the grid). Only attached while dragState is set.
  // isDragging is a boolean derived from dragState so the effect only
  // re-registers on drag start/end, not on every pointermove coordinate update.
  const isDragging = dragState !== null;
  useEffect(() => {
    if (!isDragging) return;

    function handleMove(e: PointerEvent) {
      const ds = dragStateRef.current;
      if (!ds || ds.pointerId !== e.pointerId) return;

      if (!ds.active) {
        const dist = Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY);
        if (ds.pointerType === 'touch') {
          // Tolerate finger tremor during the hold; only abort when drift
          // looks like a real scroll intent. Mouse uses the smaller threshold
          // below since a mouse cursor doesn't tremble.
          if (dist <= TOUCH_SCROLL_THRESHOLD_PX) return;
          cancelHoldTimer();
          resetDragState();
          return;
        }
        if (dist <= DRAG_MOVE_THRESHOLD_PX) return;
        // Combine activation + new coordinates in one setState so React
        // batching doesn't lose active=true when both updates are flushed.
        if (e.cancelable) e.preventDefault();
        const next = { ...ds, active: true, currentX: e.clientX, currentY: e.clientY };
        setDragState(next);
        dragStateRef.current = next;
        hitTestAndPreview(e.clientX, e.clientY, ds.id);
        return;
      }

      if (e.cancelable) e.preventDefault();

      if (ds.currentX !== e.clientX || ds.currentY !== e.clientY) {
        const next = { ...ds, currentX: e.clientX, currentY: e.clientY };
        setDragState(next);
        dragStateRef.current = next;
      }

      hitTestAndPreview(e.clientX, e.clientY, ds.id);
    }

    function handleUp(e: PointerEvent) {
      const ds = dragStateRef.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      cancelHoldTimer();

      if (ds.active) {
        suppressClickRef.current = true;
        const finalOrder = previewOrderRef.current;
        if (finalOrder && finalOrder.length > 0) {
          const currentIds = visibleTasks.map((t) => t.id);
          setNotesOrder(reconcileOrder(finalOrder, currentIds));
        }
      }

      resetDragState();
    }

    function handleCancel(e: PointerEvent) {
      const ds = dragStateRef.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      cancelHoldTimer();
      resetDragState();
    }

    // passive: false on move so preventDefault works while dragging.
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [isDragging, cancelHoldTimer, hitTestAndPreview, resetDragState, visibleTasks]);

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>, taskId: string) {
    if (!canReorder) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Don't start a drag from inside the inline action area.
    const target = e.target as HTMLElement | null;
    if (target?.closest(`.${styles.inlineActions}`)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const next: DragState = {
      id: taskId,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
      currentX: e.clientX,
      currentY: e.clientY,
      active: false,
      initialOrderIds: orderedTasks.map((t) => t.id),
    };
    setDragState(next);
    dragStateRef.current = next;

    if (e.pointerType === 'touch') {
      cancelHoldTimer();
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        const ds = dragStateRef.current;
        if (ds && ds.id === taskId && !ds.active) activateDrag();
      }, TOUCH_HOLD_MS);
    }
  }

  function openCard(id: string) {
    useStore.getState().setAvatar({ ...avatar, selectedTaskId: id });
  }

  // On mobile: first tap opens a collapsed note; tapping inside the opened
  // note body is a no-op; tapping a different note only closes the open one
  // (does not switch in a single tap). On desktop: click toggles.
  function handleCardClick(id: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
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

  const draggedTask =
    dragState?.active
      ? visibleTasks.find((t) => t.id === dragState.id) ?? null
      : null;

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
            const isRecurring = task.lifecycleType === 'recurring';
            const phase = phaseMap[task.id];
            const isActivelyDragged = dragState?.id === task.id && dragState.active;

            // While actively dragged, the card itself is rendered in a portal
            // (see below). Reserve its grid slot with a placeholder of the
            // captured card size so neighbours reflow but the row count stays.
            if (isActivelyDragged && dragState) {
              return (
                <div
                  key={task.id}
                  className={styles.dragPlaceholder}
                  style={{ minHeight: dragState.cardHeight }}
                  aria-hidden="true"
                />
              );
            }

            // Keep the card mounted through 'gap' so the slot keeps its
            // intrinsic height — otherwise the absolute-positioned stack
            // layers (inset: 0) collapse with the slot. During 'gap' the
            // card stays in its exit-end state (invisible, non-interactive).
            const showFront =
              task.isActive || phase === 'exiting' || phase === 'gap';
            const phaseClass =
              phase === 'exiting' || phase === 'gap' ? styles.cardExiting :
              phase === 'entering' ? styles.cardEntering : '';
            const cardEl = showFront ? (
              <div
                key={task.id}
                ref={(el) => setCardRef(task.id, el)}
                role="button"
                tabIndex={0}
                data-note-card="true"
                aria-hidden={phase === 'exiting' || undefined}
                className={`${styles.card} ${colorClass} ${tiltClass} ${isSelected ? styles.cardSelected : ''} ${phaseClass} ${canReorder ? styles.cardDraggable : ''}`}
                onPointerDown={canReorder ? (e) => onCardPointerDown(e, task.id) : undefined}
                onClick={() => handleCardClick(task.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(task.id); } }}
              >
                <CardContents
                  task={task}
                  isSelected={isSelected}
                  canEdit={permissions.canEditTask}
                  onComplete={() => completeTaskWithChoreography(task.id)}
                  onEdit={() => openEdit(task.id)}
                />
              </div>
            ) : null;
            if (!isRecurring) return cardEl;
            return (
              <div key={task.id} className={styles.slot}>
                <span aria-hidden="true" className={`${styles.stackLayer} ${styles.stackLayerBack} ${colorClass}`} />
                <span aria-hidden="true" className={`${styles.stackLayer} ${styles.stackLayerMid} ${colorClass}`} />
                {cardEl}
              </div>
            );
          })}
        </div>
      )}

      {draggedTask && dragState && createPortal(
        <DraggedCardOverlay task={draggedTask} drag={dragState} />,
        document.body
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

interface CardContentsProps {
  task: Task;
  isSelected: boolean;
  canEdit: boolean;
  onComplete?: () => void;
  onEdit?: () => void;
}

function CardContents({ task, isSelected, canEdit, onComplete, onEdit }: CardContentsProps) {
  return (
    <>
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
        <div className={styles.inlineActions} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button type="button" className={styles.btnComplete} onClick={onComplete}>
            Complete
          </button>
          {canEdit && (
            <button type="button" className={styles.btnEdit} onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      )}
    </>
  );
}

interface DraggedCardOverlayProps {
  task: Task;
  drag: DragState;
}

function DraggedCardOverlay({ task, drag }: DraggedCardOverlayProps) {
  const h = hashId(task.id);
  const colorClass = styles[`cardColor${h % 6}` as keyof typeof styles];
  const left = drag.currentX - drag.offsetX;
  const top = drag.currentY - drag.offsetY;
  return (
    <div
      data-testid="notes-rows-drag-overlay"
      className={`${styles.card} ${colorClass} ${styles.cardDragging}`}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: drag.cardWidth,
        height: drag.cardHeight,
        transform: `translate(${left}px, ${top}px)`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <CardContents task={task} isSelected={false} canEdit={false} />
    </div>
  );
}
