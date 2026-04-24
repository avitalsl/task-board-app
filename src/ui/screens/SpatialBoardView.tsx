import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { assignTaskPosition } from '../../domains/tasks/service';
import { assignPosition, computeNodeRadius } from '../../domains/board/layoutService';
import { startEngine, stopEngine, moveTo } from '../../domains/avatar/engine';
import { handleTaskComplete, clearSelection } from '../../application/taskActions';
import { getPermissions } from '../../domains/access/permissions';
import { editingTaskId } from '../components/BacklogEditState';
import { TaskNode } from '../components/TaskNode';
import { AvatarSprite } from '../components/AvatarSprite';
import { TaskActionMenu } from '../components/TaskActionMenu';
import { VoiceTaskModal } from '../components/VoiceTaskModal';
import styles from './BoardScreen.module.css';

export function SpatialBoardView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const scaleRef = useRef(1);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const tasks = useStore((s) => s.tasks);
  const accessType = useStore((s) => s.ui.accessType);
  const permissions = getPermissions(accessType);
  const selectedTaskId = useStore((s) => s.avatar.selectedTaskId);
  const avatarPosition = useStore((s) => s.avatar.position);

  const activeTasks = tasks.filter((t) => t.isActive);
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  // Start/stop the avatar movement engine
  useEffect(() => {
    startEngine();
    return () => stopEngine();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Assign positions to unpositioned tasks, and clamp existing positions on resize
  const MIN_SCALE = 0.15;
  const activeTaskIds = activeTasks.map((t) => t.id).join(',');
  const prevSizeRef = useRef({ width: 0, height: 0 });
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    const currentScale = scaleRef.current;
    let newScale = currentScale;

    const sizeChanged = size.width !== prevSizeRef.current.width || size.height !== prevSizeRef.current.height;
    prevSizeRef.current = { width: size.width, height: size.height };

    const positionedTasks = activeTasks.filter((t): t is typeof t & { position: { x: number; y: number } } => t.position !== null);

    if (sizeChanged && positionedTasks.length > 0) {
      // On resize: recalculate scale to fit all placed tasks (can increase or decrease)
      let maxFeasibleScale = 1;
      for (const task of positionedTasks) {
        const radius = computeNodeRadius(task.points);
        maxFeasibleScale = Math.min(
          maxFeasibleScale,
          size.width / (task.position.x + radius),
          size.height / (task.position.y + radius),
        );
      }
      newScale = Math.max(MIN_SCALE, Math.min(1, maxFeasibleScale));

      // Clamp tasks that are outside logical bounds after resize
      const logicalW = size.width / newScale;
      const logicalH = size.height / newScale;
      for (const task of positionedTasks) {
        const radius = computeNodeRadius(task.points);
        const maxX = logicalW - radius;
        const maxY = logicalH - radius;
        if (task.position.x < radius || task.position.x > maxX || task.position.y < radius || task.position.y > maxY) {
          assignTaskPosition(task.id, {
            x: Math.max(radius, Math.min(task.position.x, maxX)),
            y: Math.max(radius, Math.min(task.position.y, maxY)),
          });
        }
      }
    }

    // Place unpositioned tasks — scale can only decrease here, never increase
    const unpositioned = activeTasks.filter((t) => t.position === null);
    let placed = positionedTasks;
    for (const task of unpositioned) {
      const radius = computeNodeRadius(task.points);
      let pos = assignPosition(radius, placed, size.width / newScale, size.height / newScale);
      while (pos === null && newScale > MIN_SCALE) {
        newScale = newScale / 1.2;
        pos = assignPosition(radius, placed, size.width / newScale, size.height / newScale);
      }
      if (pos === null) {
        console.warn(`Could not place task "${task.title}" even at minimum scale`);
        continue;
      }
      assignTaskPosition(task.id, pos);
      placed = [...placed, { ...task, position: pos }];
    }

    if (newScale !== currentScale) {
      setScale(newScale);
    }
  }, [activeTaskIds, size.width, size.height]);

  // Convert screen coordinates to SVG logical coordinates (accounts for viewBox/scale)
  function getLogicalPos(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  // Scroll to zoom — must use a non-passive listener to call preventDefault
  const MAX_SCALE = 2;
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor)));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  function handleSVGClick(e: React.MouseEvent<SVGSVGElement>) {
    const pos = getLogicalPos(e.clientX, e.clientY);
    if (!pos) return;
    moveTo(pos);
  }

  // Touch: distinguish tap (intentional) from scroll (gesture)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const TAP_MAX_DISTANCE = 10; // px
  const TAP_MAX_DURATION = 300; // ms

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (touch) {
      touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const elapsed = Date.now() - start.time;
    if (elapsed > TAP_MAX_DURATION) return;

    const endTouch = e.changedTouches[0];
    if (!endTouch) return;

    const dx = endTouch.clientX - start.x;
    const dy = endTouch.clientY - start.y;
    if (Math.sqrt(dx * dx + dy * dy) > TAP_MAX_DISTANCE) return;

    const pos = getLogicalPos(endTouch.clientX, endTouch.clientY);
    if (!pos) return;
    moveTo(pos);
  }, []);

  const logicalW = size.width / scale;
  const logicalH = size.height / scale;

  return (
    <div className={styles.canvas} ref={containerRef} data-testid="spatial-board-view">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${logicalW} ${logicalH}`}
        onClick={handleSVGClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'crosshair', display: 'block', touchAction: 'none' }}
      >
        <g>
          {activeTasks.map((task) => (
            <TaskNode
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              isNearby={false}
            />
          ))}
        </g>
        <g>
          <AvatarSprite
            initialX={avatarPosition.x}
            initialY={avatarPosition.y}
          />
        </g>
      </svg>

      {selectedTask && selectedTask.position && (
        <TaskActionMenu
          taskPosition={{
            x: selectedTask.position.x * scale,
            y: selectedTask.position.y * scale,
          }}
          canEdit={permissions.canEditTask}
          onComplete={() => handleTaskComplete(selectedTask.id)}
          onEdit={() => {
            editingTaskId.value = selectedTask.id;
            clearSelection();
            useStore.getState().setUI({ activeScreen: 'backlog' });
          }}
          onClose={clearSelection}
        />
      )}

      {permissions.canCreateTask && !selectedTask && createPortal(
        <button
          className={styles.fab}
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
