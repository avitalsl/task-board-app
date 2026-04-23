import type { ParsedTask } from './types';
import { parseTaskViaApi } from '../../api/boardClient';
import { useStore } from '../../store';

export interface AIResult {
  success: boolean;
  task?: ParsedTask;
  error?: string;
}

export async function parseTaskFromText(input: string): Promise<AIResult> {
  if (!input.trim()) {
    return { success: false, error: 'Please enter a task description.' };
  }
  const ownerKey = useStore.getState().ui.ownerKey;
  if (!ownerKey) {
    return { success: false, error: 'Not authorized.' };
  }
  try {
    const { task } = await parseTaskViaApi(ownerKey, input);
    return { success: true, task };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reach AI service. Check your connection.',
    };
  }
}
