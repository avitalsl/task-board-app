import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { useStore } from '../../store';
import { assignTaskPosition } from '../../domains/tasks/service';
import { assignPosition, computeNodeRadius } from '../../domains/board/layoutService';
import { startEngine, stopEngine, moveTo } from '../../domains/avatar/engine';
import { handleTaskComplete, clearSelection } from '../../domains/board/boardLogicService';
import { editingTaskId } from '../components/BacklogEditState';
import { TaskNode } from '../components/TaskNode';
import { AvatarSprite } from '../components/AvatarSprite';
import { TaskActionMenu } from '../components/TaskActionMenu';
import { ProgressBar } from '../components/ProgressBar';
import { CompletedTaskIcons } from '../components/CompletedTaskIcons';
import styles from './BoardScreen.module.css';

export function BoardScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const tasks = useStore((s) => s.tasks);
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

  // Track board size via ResizeObserver
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
  const activeTaskIds = activeTasks.map((t) => t.id).join(',');
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    // Clamp tasks that are now outside board bounds (e.g. after resize)
    for (const task of activeTasks) {
      if (task.position.x === 0 && task.position.y === 0) continue;
      const radius = computeNodeRadius(task.points);
      const maxX = size.width - radius;
      const maxY = size.height - radius;
      if (task.position.x > maxX || task.position.y > maxY) {
        assignTaskPosition(task.id, {
          x: Math.min(task.position.x, Math.max(radius, maxX)),
          y: Math.min(task.position.y, Math.max(radius, maxY)),
        });
      }
    }

    // Place unpositioned tasks
    const unpositioned = activeTasks.filter(
      (t) => t.position.x === 0 && t.position.y === 0
    );
    if (unpositioned.length === 0) return;

    let placed = activeTasks.filter((t) => t.position.x !== 0 || t.position.y !== 0);
    for (const task of unpositioned) {
      const radius = computeNodeRadius(task.points);
      const pos = assignPosition(radius, placed, size.width, size.height);
      assignTaskPosition(task.id, pos);
      placed = [...placed, { ...task, position: pos }];
    }
  }, [activeTaskIds, size.width, size.height]);

  // Desktop click — always intentional
  function handleStageClick(e: { target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } | null } }) {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    moveTo(pos);
  }

  // Touch: distinguish tap (intentional) from scroll (gesture)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const TAP_MAX_DISTANCE = 10; // px
  const TAP_MAX_DURATION = 300; // ms

  const handleTouchStart = useCallback((e: { evt: TouchEvent }) => {
    const touch = e.evt.touches[0];
    if (touch) {
      touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, []);

  const handleTouchEnd = useCallback((e: { target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } | null } }) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const elapsed = Date.now() - start.time;
    if (elapsed > TAP_MAX_DURATION) return; // held too long — scroll

    // Check distance using the last known touch position from changedTouches
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    // We need screen-level distance to detect scrolls, but changedTouches
    // isn't directly available here. Use Konva's pointer position delta as proxy:
    // if the stage scrolled, getPointerPosition changes relative to start.
    // For a true tap, the finger barely moved on screen.
    // Access the native event for accurate screen coordinates.
    const nativeEvt = (e as unknown as { evt: TouchEvent }).evt;
    const endTouch = nativeEvt.changedTouches[0];
    if (endTouch) {
      const dx = endTouch.clientX - start.x;
      const dy = endTouch.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) > TAP_MAX_DISTANCE) return; // finger moved — scroll
    }

    moveTo(pos);
  }, []);

  return (
    <div className={styles.screen} ref={containerRef}>
      <div className={styles.overlay}>
        <ProgressBar />
        <CompletedTaskIcons />
      </div>
      <Stage
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'crosshair' }}
      >
        <Layer>
          {activeTasks.map((task) => (
            <TaskNode
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              isNearby={false}
            />
          ))}
        </Layer>
        <Layer>
          <AvatarSprite
            initialX={avatarPosition.x}
            initialY={avatarPosition.y}
          />
        </Layer>
      </Stage>

      {selectedTask && (
        <TaskActionMenu
          taskPosition={selectedTask.position}
          onComplete={() => handleTaskComplete(selectedTask.id)}
          onEdit={() => {
            editingTaskId.value = selectedTask.id;
            clearSelection();
            useStore.getState().setUI({ activeScreen: 'backlog' });
          }}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
