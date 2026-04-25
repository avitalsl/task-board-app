import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
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

  it('renders notes in the persisted notes_rows order, not tasks[] order', async () => {
    useStore.setState({
      tasks: [
        makeTask({ id: 'a', title: 'A' }),
        makeTask({ id: 'b', title: 'B' }),
        makeTask({ id: 'c', title: 'C' }),
      ],
    });
    const board = useStore.getState().board;
    useStore.getState().setBoard({
      ...board,
      layouts: { notes_rows: { order: ['c', 'a', 'b'] } },
    });
    render(<NotesRowsBoardView />);
    const titles = screen.getAllByText(/^[ABC]$/).map((el) => el.textContent);
    expect(titles).toEqual(['C', 'A', 'B']);
  });
});

// ---- Drag-and-drop interaction tests ----

function mockRect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    left, top, right, bottom,
    width: right - left, height: bottom - top,
    x: left, y: top,
    toJSON: () => '',
  } as DOMRect;
}

function pointerDown(el: Element, opts: PointerEventInit) {
  fireEvent(el, new PointerEvent('pointerdown', { bubbles: true, ...opts }));
}
function windowMove(opts: PointerEventInit) {
  act(() => { window.dispatchEvent(new PointerEvent('pointermove', opts)); });
}
function windowUp(opts: PointerEventInit) {
  act(() => { window.dispatchEvent(new PointerEvent('pointerup', opts)); });
}

describe('NotesRowsBoardView — drag and drop', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    const board = useStore.getState().board;
    useStore.getState().setBoard({ ...board, layouts: {} });
    useStore.setState((s) => ({ ui: { ...s.ui, accessType: 'owner' } }));
  });

  it('shows the drag overlay after mouse movement past activation threshold', () => {
    useStore.setState({
      tasks: [
        makeTask({ id: 'a', title: 'A', lifecycleType: 'once' }),
        makeTask({ id: 'b', title: 'B', lifecycleType: 'once' }),
      ],
    });
    render(<NotesRowsBoardView />);

    const [cardA] = Array.from(document.querySelectorAll('[data-note-card]')) as HTMLElement[];
    pointerDown(cardA, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 });
    windowMove({ pointerId: 1, clientX: 60, clientY: 50 }); // 10px — above 6px threshold

    expect(screen.getByTestId('notes-rows-drag-overlay')).toBeInTheDocument();
  });

  it('does not activate drag for mouse movement under the threshold', () => {
    useStore.setState({ tasks: [makeTask({ id: 'a', lifecycleType: 'once' })] });
    render(<NotesRowsBoardView />);

    const [cardA] = Array.from(document.querySelectorAll('[data-note-card]')) as HTMLElement[];
    pointerDown(cardA, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 });
    windowMove({ pointerId: 1, clientX: 53, clientY: 50 }); // 3px — under threshold

    expect(screen.queryByTestId('notes-rows-drag-overlay')).not.toBeInTheDocument();
  });

  it('clears the drag overlay after the pointer is released', () => {
    useStore.setState({ tasks: [makeTask({ id: 'a', lifecycleType: 'once' })] });
    render(<NotesRowsBoardView />);

    const [cardA] = Array.from(document.querySelectorAll('[data-note-card]')) as HTMLElement[];
    pointerDown(cardA, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 });
    windowMove({ pointerId: 1, clientX: 60, clientY: 50 });
    expect(screen.getByTestId('notes-rows-drag-overlay')).toBeInTheDocument();

    windowUp({ pointerId: 1, clientX: 60, clientY: 50 });
    expect(screen.queryByTestId('notes-rows-drag-overlay')).not.toBeInTheDocument();
  });

  it('persists the reordered position to the store on drop', () => {
    useStore.setState({
      tasks: [
        makeTask({ id: 'a', title: 'A', lifecycleType: 'once' }),
        makeTask({ id: 'b', title: 'B', lifecycleType: 'once' }),
        makeTask({ id: 'c', title: 'C', lifecycleType: 'once' }),
      ],
    });
    render(<NotesRowsBoardView />);

    const [, cardB] = Array.from(document.querySelectorAll('[data-note-card]')) as HTMLElement[];
    // Cards render in tasks[] order [a, b, c]. Mock card B's position in the viewport.
    vi.spyOn(cardB, 'getBoundingClientRect').mockReturnValue(mockRect(300, 0, 500, 150));

    // Drag card A: activate, then sweep over card B, then release.
    const [cardA] = Array.from(document.querySelectorAll('[data-note-card]')) as HTMLElement[];
    pointerDown(cardA, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50 });
    windowMove({ pointerId: 1, clientX: 60, clientY: 50 });   // activate drag
    windowMove({ pointerId: 1, clientX: 400, clientY: 75 });  // over card B → reorder
    windowUp({ pointerId: 1, clientX: 400, clientY: 75 });    // drop

    expect(useStore.getState().board.layouts?.notes_rows?.order).toEqual(['b', 'a', 'c']);
  });
});
