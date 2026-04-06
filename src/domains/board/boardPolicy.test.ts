import { describe, it, expect } from 'vitest';
import { getBoardPermissions } from './boardPolicy';

describe('getBoardPermissions', () => {
  describe('manage mode', () => {
    it('allows all actions', () => {
      const p = getBoardPermissions('manage');
      expect(p.canCreateTask).toBe(true);
      expect(p.canEditTask).toBe(true);
      expect(p.canDeleteTask).toBe(true);
      expect(p.canDuplicateTask).toBe(true);
      expect(p.canCompleteTask).toBe(true);
      expect(p.canChangeSettings).toBe(true);
    });
  });

  describe('play mode', () => {
    it('allows completing tasks', () => {
      const p = getBoardPermissions('play');
      expect(p.canCompleteTask).toBe(true);
    });

    it('blocks create, edit, delete, duplicate, and change settings', () => {
      const p = getBoardPermissions('play');
      expect(p.canCreateTask).toBe(false);
      expect(p.canEditTask).toBe(false);
      expect(p.canDeleteTask).toBe(false);
      expect(p.canDuplicateTask).toBe(false);
      expect(p.canChangeSettings).toBe(false);
    });
  });
});
