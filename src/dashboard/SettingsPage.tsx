import { useEffect, useState } from 'react';
import { useDashboard } from '../state/dashboardStore';
import { localStorageBytes } from '../state/incidents';
import { db } from '../engines/evidence/vault';
import { FollowUpList } from './FollowUp';
import { t, speechLangFor, type Lang } from '../i18n';
import { useToast } from '../components/Toast';

// Settings: language, Calm/Caregiver, speech, storage, export, delete, wipe.
// Every control writes a real setting or downloads/deletes real data.
export function SettingsPage() {
  const settings = useDashboard((s) => s.settings);
  const setSettings = useDashboard((s) => s.setSettings);
  const incidents = useDashboard((s) => s.incidents);
  const active = useDashboard((s) => s.active());
  const deleteIncident = useDashboard((s) => s.deleteIncident);
  const wipeAll = useDashboard((s) => s.wipeAll);
  const showToast = useToast();
  const [storageKb, setStorageKb] = useState(0);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const lang = settings.language;

  useEffect(() => {
    setStorageKb(Math.round(localStorageBytes() / 1024));
    db.evidence.count().then(setEvidenceCount).catch(() => setEvidenceCount(0));
  }, [incidents.length]);

  function exportAll() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'RAKSHIO',
      incidents,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rakshio-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(t(lang, 'settingsExportToast'));
  }

  async function wipe() {
    await wipeAll();
    showToast(t(lang, 'settingsWipeToast'));
    window.location.assign('/#/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <p className="db-page-sub">{t(lang, 'settingsSub')}</p>
      </div>

      <section className="db-card" aria-label="Language and modes">
        <h2>{t(lang, 'settingsLangTitle')}</h2>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsLangLabel')}</strong>
            <p className="db-muted">{t(lang, 'settingsLangHint')}</p>
          </div>
          <select
            className="db-input w-48 shrink-0"
            aria-label="Dashboard language"
            value={settings.language}
            onChange={(e) => {
              const language = e.target.value as Lang;
              // UI language drives the speech language: Hinglish/Hindi
              // speakers speak Hindi; only the English UI listens in English.
              setSettings({ language, speechLang: speechLangFor(language) });
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="hg">Hinglish</option>
          </select>
        </div>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsCalmTitle')}</strong>
            <p className="db-muted">{t(lang, 'settingsCalmHint')}</p>
          </div>
          <button
            type="button"
            className="db-toggle"
            role="switch"
            aria-checked={settings.calmPrompt}
            aria-label={t(lang, 'settingsCalmSwitch')}
            onClick={() => setSettings({ calmPrompt: !settings.calmPrompt })}
          />
        </div>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsCaregiverTitle')}</strong>
            <p className="db-muted">{t(lang, 'settingsCaregiverHint')}</p>
          </div>
          <button
            type="button"
            className="db-toggle"
            role="switch"
            aria-checked={settings.caregiver}
            aria-label={t(lang, 'settingsCaregiverSwitch')}
            onClick={() => setSettings({ caregiver: !settings.caregiver })}
          />
        </div>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsLargeType')}</strong>
            <p className="db-muted">{t(lang, 'settingsLargeTypeHint')}</p>
          </div>
          <button
            type="button"
            className="db-toggle"
            role="switch"
            aria-checked={settings.largeType}
            aria-label={t(lang, 'settingsLargeTypeSwitch')}
            onClick={() => setSettings({ largeType: !settings.largeType })}
          />
        </div>
      </section>

      <section className="db-card" aria-label="Speech settings">
        <h2>{t(lang, 'settingsSpeechTitle')}</h2>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsSpeechLabel')}</strong>
            <p className="db-muted">{t(lang, 'settingsSpeechHint')}</p>
          </div>
          <select
            className="db-input w-48 shrink-0"
            aria-label="Speech language"
            value={settings.speechLang}
            onChange={(e) => setSettings({ speechLang: e.target.value as 'hi-IN' | 'en-IN' })}
          >
            <option value="hi-IN">Hindi (hi-IN)</option>
            <option value="en-IN">English (en-IN)</option>
          </select>
        </div>
        <div className="db-setting-row">
          <div>
            <strong>{t(lang, 'settingsTtsTitle')}</strong>
            <p className="db-muted">{t(lang, 'settingsTtsHint', { rate: settings.ttsRate.toFixed(2) })}</p>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.25"
            step="0.05"
            value={settings.ttsRate}
            aria-label="TTS speed"
            onChange={(e) => setSettings({ ttsRate: Number(e.target.value) })}
            className="w-48 shrink-0"
          />
        </div>
        <p className="db-muted">{t(lang, 'settingsSpeechNote')}</p>
      </section>

      <section className="db-card" aria-label="Storage">
        <h2>{t(lang, 'settingsStorageTitle')}</h2>
        <div className="db-rows">
          <div className="db-row"><span className="k">{t(lang, 'settingsStorageLocal')}</span><span className="v">~{storageKb} KB</span></div>
          <div className="db-row"><span className="k">{t(lang, 'settingsStorageVault')}</span><span className="v">{evidenceCount}</span></div>
          <div className="db-row"><span className="k">{t(lang, 'settingsStorageIncidents')}</span><span className="v">{incidents.length}</span></div>
        </div>
        <div>
          <button type="button" className="db-btn db-btn-outline" onClick={exportAll}>
            {t(lang, 'settingsExportBtn')}
          </button>
        </div>
      </section>

      {active && (
        <section className="db-card" aria-label="Follow-up Guardian">
          <h2>{t(lang, 'guardianTitle')}</h2>
          <p className="db-muted">{t(lang, 'settingsActiveIncident')} {active.amount != null ? `₹${active.amount.toLocaleString('en-IN')}` : t(lang, 'unknown')} — {t(lang, 'settingsGuardianNoteB')}</p>
          <FollowUpList incident={active} />
        </section>
      )}

      <section className="db-card" aria-label="Delete incidents">
        <h2>{t(lang, 'settingsDeleteTitle')}</h2>
        {incidents.length === 0 ? (
          <p className="db-muted">{t(lang, 'settingsDeleteEmpty')}</p>
        ) : (
          <div className="db-rows">
            {incidents.map((i) => (
              <div key={i.id} className="db-setting-row">
                <div>
                  <strong>#{i.id.replace(/^rk-/, 'RK-').toUpperCase()}</strong>
                  <p className="db-muted">
                    {i.amount != null ? `₹${i.amount.toLocaleString('en-IN')}` : t(lang, 'unknown')} · {new Date(i.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button type="button" className="db-btn db-btn-sm db-btn-outline" onClick={() => deleteIncident(i.id)}>
                  {t(lang, 'settingsDeleteBtn')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="db-card" aria-label="One-tap wipe">
        <h2>{t(lang, 'settingsWipeTitle')}</h2>
        <p className="db-muted">{t(lang, 'settingsWipeHint')}</p>
        {confirmWipe ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="db-btn db-btn-red" onClick={wipe}>
              {t(lang, 'settingsWipeConfirm')}
            </button>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmWipe(false)}>
              {t(lang, 'settingsWipeCancel')}
            </button>
          </div>
        ) : (
          <div>
            <button type="button" className="db-btn db-btn-red" onClick={() => setConfirmWipe(true)}>
              {t(lang, 'settingsWipeBtn')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
