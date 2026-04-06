import type { Board } from './types';

export interface BoardPermissions {
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canDuplicateTask: boolean;
  canCompleteTask: boolean;
  canChangeSettings: boolean;
}

export function getBoardPermissions(mode: Board['mode']): BoardPermissions {
  switch (mode) {
    case 'manage':
      return {
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canDuplicateTask: true,
        canCompleteTask: true,
        canChangeSettings: true,
      };
    case 'play':
      return {
        canCreateTask: false,
        canEditTask: false,
        canDeleteTask: false,
        canDuplicateTask: false,
        canCompleteTask: true,
        canChangeSettings: false,
      };
  }
}
