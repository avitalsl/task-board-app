import { useEffect } from 'react';
import { useStore } from './store';
import { bootstrapApp } from './bootstrap';
import { BoardScreen } from './ui/screens/BoardScreen';
import { BacklogScreen } from './ui/screens/BacklogScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { LandingScreen } from './ui/screens/LandingScreen';
import { useResetCheck } from './hooks/useResetCheck';
import styles from './App.module.css';

export default function App() {
  useResetCheck();
  const activeScreen = useStore((s) => s.ui.activeScreen);
  const setUI = useStore((s) => s.setUI);
  const accessType = useStore((s) => s.ui.accessType);
  const isBootstrapping = useStore((s) => s.ui.isBootstrapping);
  const bootstrapError = useStore((s) => s.ui.bootstrapError);
  const needsLandingChoice = useStore((s) => s.ui.needsLandingChoice);
  const syncStatus = useStore((s) => s.ui.syncStatus);

  useEffect(() => {
    bootstrapApp();
  }, []);

  // Token-user sessions start in a loading state while the backend is fetched.
  if (isBootstrapping) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingScreen}>
          <p>Loading board…</p>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className={styles.app}>
        <div className={styles.loadingScreen}>
          <p className={styles.errorText}>{bootstrapError}</p>
        </div>
      </div>
    );
  }

  if (needsLandingChoice) {
    return (
      <div className={styles.app}>
        <LandingScreen />
      </div>
    );
  }

  // Token-based share recipients only see the board (complete-only view).
  // Backlog and Settings are owner-only.
  const isOwner = accessType === 'owner';
  const tabs = isOwner
    ? (['board', 'backlog', 'settings'] as const)
    : (['board'] as const);

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <span className={styles.logo}>TaskBoard</span>
        <div className={styles.tabs}>
          {tabs.map((screen) => (
            <button
              key={screen}
              className={`${styles.tab} ${activeScreen === screen ? styles.tabActive : ''}`}
              onClick={() => setUI({ activeScreen: screen })}
            >
              {screen === 'board' ? '🗺 Board' : screen === 'backlog' ? '📋 Backlog' : '⚙️ Settings'}
            </button>
          ))}
        </div>
        {isOwner && syncStatus !== 'idle' && (
          <span
            className={`${styles.syncStatus} ${syncStatus === 'error' ? styles.syncStatusError : ''}`}
            title={syncStatus === 'error' ? 'Last sync to server failed' : 'Saving to server…'}
          >
            {syncStatus === 'error' ? '⚠ Sync failed' : 'Saving…'}
          </span>
        )}
        {!isOwner && (
          <span className={styles.sharedBadge}>Shared view</span>
        )}
      </nav>

      <main className={styles.main}>
        {activeScreen === 'board' && <BoardScreen />}
        {activeScreen === 'backlog' && isOwner && <BacklogScreen />}
        {activeScreen === 'settings' && isOwner && <SettingsScreen />}
      </main>
    </div>
  );
}
