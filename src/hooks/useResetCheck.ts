import { useEffect } from 'react';
import { checkReset } from '../application/periodActions';

const INTERVAL_MS = 60_000; // 60 seconds

export function useResetCheck() {
  useEffect(() => {
    // Check on mount (handles missed resets when app was closed)
    checkReset();

    // Check every 60s while app is open
    const interval = setInterval(checkReset, INTERVAL_MS);

    // Check on tab/window resume
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkReset();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
