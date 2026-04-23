import { useState } from 'react';
import { useStore } from '../../store';
import { updateSettings } from '../../domains/settings/service';
import { changeMode, updateTargetScore, resetCurrentPeriod } from '../../application/settingsActions';
import type { GoalMode, GoalType } from '../../domains/settings/types';
import { AVATARS } from '../../domains/avatar/avatarConfig';
import { generateShareToken, revokeShareToken } from '../../api/boardClient';
import styles from './SettingsScreen.module.css';

/**
 * Share panel — lets the owner generate and revoke a share link.
 *
 * @temporary This component supports the temporary token-based MVP sharing model.
 * Future: replace with a proper invite/membership UI.
 */
function SharePanel({ ownerKey }: { ownerKey: string }) {
  const shareToken = useStore((s) => s.ui.shareToken);
  const setUI = useStore((s) => s.setUI);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}${window.location.pathname}?shareToken=${shareToken}`
    : null;

  async function handleGenerate() {
    setBusy(true);
    try {
      const { shareToken: token } = await generateShareToken(ownerKey);
      setUI({ shareToken: token });
    } catch (err) {
      console.error('Failed to generate share token:', err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    try {
      await revokeShareToken(ownerKey);
      setUI({ shareToken: undefined });
    } catch (err) {
      console.error('Failed to revoke share token:', err);
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className={styles.section}>
      <h3>Share Board</h3>
      <p className={styles.hint}>
        Share a link that lets someone mark tasks as complete — nothing else.
      </p>
      {shareUrl ? (
        <>
          <div className={styles.shareUrlRow}>
            <input className={styles.input} readOnly value={shareUrl} />
            <button className={styles.btnSecondary} onClick={handleCopy} disabled={busy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button className={styles.btnDanger} onClick={handleRevoke} disabled={busy}>
            {busy ? 'Revoking...' : 'Revoke link'}
          </button>
        </>
      ) : (
        <button className={styles.btnPrimary} onClick={handleGenerate} disabled={busy}>
          {busy ? 'Generating...' : 'Generate share link'}
        </button>
      )}
    </section>
  );
}

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const scoring = useStore((s) => s.scoring);
  const period = useStore((s) => s.period);
  const periodHistory = useStore((s) => s.periodHistory);
  const avatar = useStore((s) => s.avatar);
  const setAvatar = useStore((s) => s.setAvatar);
  const accessType = useStore((s) => s.ui.accessType);
  const ownerKey = useStore((s) => s.ui.ownerKey);

  // Token-based share recipients should not access settings.
  // They are only allowed to complete tasks.
  if (accessType !== 'owner') {
    return (
      <div className={styles.screen}>
        <p className={styles.hint}>Settings are not available with shared access.</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <h2>Settings</h2>

      <section className={styles.section}>
        <h3>Character</h3>
        <div className={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <button
              key={a.id}
              className={`${styles.avatarCard} ${avatar.avatarId === a.id ? styles.avatarCardActive : ''}`}
              onClick={() => setAvatar({ ...avatar, avatarId: a.id })}
              title={a.label}
            >
              <img src={a.previewUrl} alt={a.label} className={styles.avatarPreview} draggable={false} />
              <span className={styles.avatarLabel}>{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3>Goal Mode</h3>
        <div className={styles.modeGroup}>
          {(['no_goal', 'daily', 'weekly', 'unlimited'] as GoalMode[]).map((m) => (
            <button
              key={m}
              className={`${styles.modeBtn} ${settings.mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => changeMode(m)}
            >
              {m === 'no_goal' ? 'No Goal' : m === 'daily' ? 'Daily' : m === 'weekly' ? 'Weekly' : 'Unlimited'}
            </button>
          ))}
        </div>
        {settings.mode !== 'no_goal' && (
          <p className={styles.hint}>
            Changing mode resets current period progress. Total score is preserved.
          </p>
        )}
      </section>

      {settings.mode !== 'no_goal' && (
        <>
          <section className={styles.section}>
            <h3>Goal Type</h3>
            <select
              className={styles.select}
              value={settings.goalType}
              onChange={(e) => updateSettings({ goalType: e.target.value as GoalType })}
            >
              <option value="points">Points only</option>
              <option value="required_tasks">Required tasks only</option>
              <option value="combined">Combined (points + required tasks)</option>
            </select>
          </section>

          <section className={styles.section}>
            <h3>Target Score</h3>
            <div className={styles.row}>
              <input
                type="number"
                className={styles.input}
                min={1}
                value={settings.targetScore}
                onChange={(e) => updateTargetScore(Number(e.target.value))}
              />
              <span className={styles.hint}>points to complete the period goal</span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>Required Task Target</h3>
            <div className={styles.row}>
              <input
                type="number"
                className={styles.input}
                min={0}
                value={settings.targetRequiredTaskCount}
                onChange={(e) => updateSettings({ targetRequiredTaskCount: Number(e.target.value) })}
              />
              <span className={styles.hint}>required tasks to complete</span>
            </div>
          </section>

          {settings.mode !== 'unlimited' && (
            <section className={styles.section}>
              <h3>Bonus Multiplier</h3>
              <div className={styles.row}>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  max={10}
                  step={0.1}
                  value={settings.bonusMultiplier}
                  onChange={(e) => updateSettings({ bonusMultiplier: Number(e.target.value) })}
                />
                <span className={styles.hint}>applied to period score when goal is achieved</span>
              </div>
            </section>
          )}

          {settings.mode !== 'unlimited' && (
            <section className={styles.section}>
              <h3>Reset Hour</h3>
              <div className={styles.row}>
                <input
                  type="number"
                  className={styles.input}
                  min={0}
                  max={23}
                  value={settings.resetHour}
                  onChange={(e) => updateSettings({ resetHour: Number(e.target.value) })}
                />
                <span className={styles.hint}>hour of day (0–23) when the period resets</span>
              </div>
            </section>
          )}
        </>
      )}

      {period && (
        <section className={styles.section}>
          <h3>Current Period</h3>
          <div className={styles.periodInfo}>
            {settings.mode === 'unlimited'
              ? <span>Started: <strong>{new Date(period.start).toLocaleString()}</strong></span>
              : <span>Resets: <strong>{new Date(period.end).toLocaleString()}</strong></span>
            }
          </div>
          <button className={styles.btnSecondary} onClick={resetCurrentPeriod}>
            Reset period
          </button>
        </section>
      )}

      <section className={styles.section}>
        <h3>Current Progress</h3>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{scoring.totalScore}</span>
            <span className={styles.statLabel}>Total Score</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{scoring.currentPeriodScore}</span>
            <span className={styles.statLabel}>Period Score</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{scoring.currentPeriodRequiredCompleted}</span>
            <span className={styles.statLabel}>Required Done</span>
          </div>
        </div>
      </section>

      {periodHistory.length > 0 && (
        <section className={styles.section}>
          <h3>History</h3>
          <ul className={styles.historyList}>
            {[...periodHistory].reverse().map((entry) => (
              <li key={entry.periodId} className={styles.historyEntry}>
                <span className={styles.historyMode}>{entry.mode}</span>
                <span>{new Date(entry.start).toLocaleDateString()} – {new Date(entry.end).toLocaleDateString()}</span>
                <span>{entry.score} pts</span>
                <span className={entry.goalAchieved ? styles.goalYes : styles.goalNo}>
                  {entry.goalAchieved ? 'Goal met' : 'Goal missed'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ownerKey && <SharePanel ownerKey={ownerKey} />}
    </div>
  );
}
