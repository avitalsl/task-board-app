import type { AccessType } from './types.ts';
import type { BoardPermissions } from '../board/boardPolicy.ts';

/**
 * Returns the set of permitted board actions for the given access type.
 *
 * This is the single source of truth for what each access type may do.
 * All UI gating AND backend enforcement derive from this contract.
 *
 * @temporary Uses AccessType, which is part of the temporary MVP access model.
 * Future: permissions should derive from a membership/role system.
 */
export function getPermissions(accessType: AccessType): BoardPermissions {
  switch (accessType) {
    case 'owner':
      return {
        canCreateTask:    true,
        canEditTask:      true,
        canDeleteTask:    true,
        canDuplicateTask: true,
        canCompleteTask:  true,
        canChangeSettings: true,
      };

    case 'complete_only_link':
      // Share-link recipients can ONLY complete tasks.
      // All management actions are blocked in both the UI and the server API.
      return {
        canCreateTask:    false,
        canEditTask:      false,
        canDeleteTask:    false,
        canDuplicateTask: false,
        canCompleteTask:  true,
        canChangeSettings: false,
      };
  }
}
