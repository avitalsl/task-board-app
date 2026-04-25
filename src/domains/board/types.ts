export type BoardPresentation = 'spatial' | 'notes_rows'

/**
 * Layout metadata for the `notes_rows` presentation.
 * `order` is a list of task ids in their preferred render order — captured by
 * user reordering. Ids may be stale (refer to deleted tasks); the renderer is
 * responsible for filtering and appending unknown tasks.
 */
export interface NotesRowsLayout {
  order: string[]
}

/**
 * Per-presentation layout state owned by a board. Each presentation may
 * persist its own layout shape here (e.g. `notes_rows` stores an order list,
 * a future spatial layout could store positions). Adding a new presentation's
 * layout is purely additive — old data simply lacks that key.
 */
export interface BoardLayouts {
  notes_rows?: NotesRowsLayout
}

export type Board = {
  id: string
  userId: string
  name: string
  mode: 'manage' | 'play'
  presentation: BoardPresentation
  layouts?: BoardLayouts
  createdAt: string
}
