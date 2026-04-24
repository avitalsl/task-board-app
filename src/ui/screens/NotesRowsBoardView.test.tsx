import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useStore } from '../../store';
import { NotesRowsBoardView } from './NotesRowsBoardView';
import type { Task } from '../../domains/tasks/types';

// VoiceTaskModal autostarts the mic on mount — stub it out for tests.
vi.mock('../components/VoiceTaskModal', () => ({
  VoiceTaskModal: () => null,
}));

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    boardId: 'default-board',
    title: 'Sample task',
    description: '',
    baseTimeMinutes: 10,
    difficultyMultiplier: 1,
    type: 'optional',
    lifecycleType: 'recurring',
    position: null,
    isActive: true,
    isCompleted: false,
    completedAt: null,
    completionCount: 0,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

beforeEach(() => {
  cleanup();
  // Ensure tests run as 'owner' so create + edit are available.
  useStore.setState((s) => ({ ui: { ...s.ui, accessType: 'owner' } }));
});

describe('NotesRowsBoardView', () => {
  it('renders the empty state when there are no active tasks', () => {
    useStore.setState({ tasks: [] });
    render(<NotesRowsBoardView />);
    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('does not render the empty state when at least one active task exists', () => {
    useStore.setState({ tasks: [makeTask({ title: 'Hello' })] });
    render(<NotesRowsBoardView />);
    expect(screen.queryByText('No active tasks')).not.toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
