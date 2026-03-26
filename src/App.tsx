import { useStore } from './store';
import { BoardScreen } from './ui/screens/BoardScreen';
import { BacklogScreen } from './ui/screens/BacklogScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { useResetCheck } from './hooks/useResetCheck';
import styles from './App.module.css';

export default function App() {
  useResetCheck();
  const activeScreen = useStore((s) => s.ui.activeScreen);
  const setUI = useStore((s) => s.setUI);

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <span className={styles.logo}>⚔️ TaskBoard</span>
        <div className={styles.tabs}>
          {(['board', 'backlog', 'settings'] as const).map((screen) => (
            <button
              key={screen}
              className={`${styles.tab} ${activeScreen === screen ? styles.tabActive : ''}`}
              onClick={() => setUI({ activeScreen: screen })}
            >
              {screen === 'board' ? '🗺 Board' : screen === 'backlog' ? '📋 Backlog' : '⚙️ Settings'}
            </button>
          ))}
        </div>
      </nav>

      <main className={styles.main}>
        {activeScreen === 'board' && <BoardScreen />}
        {activeScreen === 'backlog' && <BacklogScreen />}
        {activeScreen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}
