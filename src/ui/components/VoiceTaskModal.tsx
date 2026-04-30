import { useEffect, useRef, useState } from 'react';
import { createTask } from '../../domains/tasks/service';
import { parseTaskFromText } from '../../domains/ai/service';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import styles from './VoiceTaskModal.module.css';

interface Props {
  onClose: () => void;
}

export function VoiceTaskModal({ onClose }: Props) {
  const voice = useVoiceInput();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-start mic on mount.
  // setTimeout(0) defers the start past the current synchronous task. React StrictMode's
  // test-unmount is synchronous, so it always cancels the timer before the mic starts —
  // guaranteeing no double-start conflict in the browser Speech API.
  useEffect(() => {
    console.log('[VoiceTaskModal] mounted, scheduling mic start');
    const timer = setTimeout(() => {
      console.log('[VoiceTaskModal] starting mic');
      voice.start();
    }, 0);
    return () => {
      console.log('[VoiceTaskModal] unmounting, cancelling/stopping');
      clearTimeout(timer);
      voice.stop();
    };
  }, []);

  // Log voice state changes
  useEffect(() => {
    console.log('[VoiceTaskModal] isListening:', voice.isListening);
  }, [voice.isListening]);

  // Voice transcript → AI pipeline
  useEffect(() => {
    if (!voice.transcript) return;
    console.log('[VoiceTaskModal] transcript received:', voice.transcript);
    (async () => {
      if (!mountedRef.current) return;
      setAiLoading(true);
      setAiError(null);
      console.log('[VoiceTaskModal] calling parseTaskFromText...');
      const result = await parseTaskFromText(voice.transcript!);
      console.log('[VoiceTaskModal] parseTaskFromText result:', result);
      if (!mountedRef.current) return;
      setAiLoading(false);
      if (result.success && result.task) {
        console.log('[VoiceTaskModal] creating task:', result.task);
        createTask({ ...result.task, lifecycleType: 'recurring' });
        onClose();
      } else {
        console.log('[VoiceTaskModal] parse failed:', result.error);
        setAiError(result.error ?? 'Could not parse task');
      }
    })();
  }, [voice.transcript]);

  // Voice error → show in UI
  useEffect(() => {
    if (voice.error) {
      console.log('[VoiceTaskModal] voice error:', voice.error);
      setAiError(voice.error);
    }
  }, [voice.error]);

  function handleClose() {
    voice.stop();
    onClose();
  }

  function handleRetry() {
    setAiError(null);
    voice.start();
  }

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} />
      <div className={styles.card}>
        <div className={styles.header}>
          <button className={styles.btnClose} onClick={handleClose}>✕</button>
        </div>

        <div className={`${styles.micIcon} ${voice.isListening ? styles.listening : ''}`}>
          🎤
        </div>

        {aiError ? (
          <>
            <p className={styles.errorText}>{aiError}</p>
            <div className={styles.actions}>
              {!aiError.includes('permission') && (
                <button className={styles.btnRetry} onClick={handleRetry}>
                  Try Again
                </button>
              )}
              <button className={styles.btnCancel} onClick={handleClose}>
                Cancel
              </button>
            </div>
          </>
        ) : aiLoading ? (
          <p className={styles.statusText}>Processing...</p>
        ) : (
          <p className={styles.statusText}>
            {voice.isListening ? 'Listening...' : 'Starting mic...'}
          </p>
        )}
      </div>
    </>
  );
}
