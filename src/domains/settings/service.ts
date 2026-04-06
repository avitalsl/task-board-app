import { useStore } from '../../store';
import type { Settings } from './types';

export function updateSettings(patch: Partial<Settings>): void {
  const current = useStore.getState().settings;
  useStore.getState().setSettings({ ...current, ...patch });
}
