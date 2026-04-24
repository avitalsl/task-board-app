import { useStore } from '../../store';
import { ProgressBar } from '../components/ProgressBar';
import { CompletedTaskIcons } from '../components/CompletedTaskIcons';
import { SpatialBoardView } from './SpatialBoardView';
import { NotesRowsBoardView } from './NotesRowsBoardView';
import styles from './BoardScreen.module.css';

export function BoardScreen() {
  const presentation = useStore((s) => s.board.presentation);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <ProgressBar />
        <CompletedTaskIcons />
      </div>
      {presentation === 'notes_rows' ? <NotesRowsBoardView /> : <SpatialBoardView />}
    </div>
  );
}
