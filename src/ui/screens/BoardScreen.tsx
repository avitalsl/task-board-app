import { useEffect, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { useStore } from '../../store';
import { assignTaskPosition } from '../../domains/tasks/service';
import { assignPosition, computeNodeRadius } from '../../domains/board/layoutService';
import { startEngine, stopEngine } from '../../domains/avatar/engine';
import { handleTaskComplete, clearSelection } from '../../domains/board/boardLogicService';
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
  const avatar = useStore((s) => s.avatar);
  const setAvatar = useStore((s) => s.setAvatar);

  const activeTasks = tasks.filter((t) => t.isActive);
  const selectedTask = avatar.selectedTaskId
    ? tasks.find((t) => t.id === avatar.selectedTaskId) ?? null
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

  function handleStageClick(e: { target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } | null } }) {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    clearSelection();
    setAvatar({ ...avatar, targetPosition: pos, selectedTaskId: null });
  }

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
        onTap={handleStageClick}
        style={{ cursor: 'crosshair' }}
      >
        <Layer>
          {activeTasks.map((task) => (
            <TaskNode
              key={task.id}
              task={task}
              isSelected={avatar.selectedTaskId === task.id}
              isNearby={false}
            />
          ))}

          <AvatarSprite
            x={avatar.position.x}
            y={avatar.position.y}
            isMoving={avatar.isMoving}
          />
        </Layer>
      </Stage>

      {selectedTask && (
        <TaskActionMenu
          task={selectedTask}
          onComplete={() => handleTaskComplete(selectedTask.id)}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
