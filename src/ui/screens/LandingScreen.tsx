import { useState } from 'react';
import { createNewBoard, openBoardWithKey } from '../../bootstrap';
import styles from './LandingScreen.module.css';

type Mode = 'choice' | 'paste';

export function LandingScreen() {
  const [mode, setMode] = useState<Mode>('choice');
  const [keyInput, setKeyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await createNewBoard();
    } catch {
      setError('Could not create a new board. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  async function handleSubmitKey() {
    setSubmitting(true);
    setError(null);
    const result = await openBoardWithKey(keyInput);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
    }
    // On ok, store update unmounts this component.
  }

  return (
    <div className={styles.landing}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to TaskBoard</h1>
        <p className={styles.subtitle}>
          Start fresh, or continue from a board you already have.
        </p>

        {mode === 'choice' && (
          <div className={styles.buttons}>
            <button
              className={styles.btnPrimary}
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Working…' : 'Create new board'}
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                setError(null);
                setMode('paste');
              }}
              disabled={submitting}
            >
              I have a board key
            </button>
          </div>
        )}

        {mode === 'paste' && (
          <>
            <input
              autoFocus
              className={styles.input}
              type="text"
              placeholder="Paste your board key"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                if (error) setError(null);
              }}
              disabled={submitting}
            />
            <div className={styles.row}>
              <button
                className={styles.btnPrimary}
                onClick={handleSubmitKey}
                disabled={submitting}
              >
                {submitting ? 'Working…' : 'Open board'}
              </button>
              <button
                className={styles.backLink}
                onClick={() => {
                  setError(null);
                  setKeyInput('');
                  setMode('choice');
                }}
                disabled={submitting}
              >
                Back
              </button>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
