export type BoardPresentation = 'spatial' | 'notes_rows'

export type Board = {
  id: string
  userId: string
  name: string
  mode: 'manage' | 'play'
  presentation: BoardPresentation
  createdAt: string
}
