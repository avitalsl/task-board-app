import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useStore } from '../../store';
import { BoardScreen } from './BoardScreen';

// Stub the two view components so we test branching without their (heavy) effects.
vi.mock('./SpatialBoardView', () => ({
  SpatialBoardView: () => <div data-testid="spatial-board-view" />,
}));
vi.mock('./NotesRowsBoardView', () => ({
  NotesRowsBoardView: () => <div data-testid="notes-rows-board-view" />,
}));
// Top-bar components read scoring/settings; stub them so the test focuses on branching.
vi.mock('../components/ProgressBar', () => ({ ProgressBar: () => null }));
vi.mock('../components/CompletedTaskIcons', () => ({ CompletedTaskIcons: () => null }));

beforeEach(() => {
  cleanup();
});

function setPresentation(presentation: 'spatial' | 'notes_rows') {
  const board = useStore.getState().board;
  useStore.setState({ board: { ...board, presentation } });
}

describe('BoardScreen presentation branching', () => {
  it('renders SpatialBoardView when board.presentation is "spatial"', () => {
    setPresentation('spatial');
    render(<BoardScreen />);
    expect(screen.getByTestId('spatial-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-rows-board-view')).not.toBeInTheDocument();
  });

  it('renders NotesRowsBoardView when board.presentation is "notes_rows"', () => {
    setPresentation('notes_rows');
    render(<BoardScreen />);
    expect(screen.getByTestId('notes-rows-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('spatial-board-view')).not.toBeInTheDocument();
  });
});
