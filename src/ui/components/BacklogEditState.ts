// Simple shared ref for passing a task ID from Board → Backlog for editing.
// Not in Zustand because it's ephemeral UI coordination, not app state.
export const editingTaskId: { value: string | null } = { value: null };
