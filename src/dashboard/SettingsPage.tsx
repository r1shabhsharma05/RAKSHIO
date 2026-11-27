import { useEffect, useState } from 'react';
import { useDashboard } from '../state/dashboardStore';
import { localStorageBytes } from '../state/incidents';
import { db } from '../engines/evidence/vault';
import { FollowUpList } from './FollowUp';
import { t } from '../i18n';
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
    showToast('Export download ho gaya');
  }

  async function wipe() {
    await wipeAll();
    showToast('Sab kuch saaf ho gaya');
    window.location.assign('/#/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="db-page-title">{t(lang, 'settingsTitle')}</h1>
        <p className="db-page-sub">Language, calm mode, speech, storage — sab kuch is device par hai.</p>
      </div>

      <section className="db-card" aria-label="Language and modes">
        <h2>Language aur mode</h2>
        <div className="db-setting-row">
          <div>
            <strong>Dashboard language</strong>
            <p className="db-muted">Sidebar aur dashboard headings ki bhasha. Panic flow hamesha Hinglish me rehta hai.</p>
          </div>
          <select
            className="db-input w-48 shrink-0"
            aria-label="Dashboard language"
            value={settings.language}
            onChange={(e) => setSettings({ language: e.target.value as 'en' | 'hi' })}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        </div>
        <div className="db-setting-row">
          <div>
            <strong>Calm prompt (10 second)</strong>
            <p className="db-muted">Panic screen par &ldquo;Aap safe hain&rdquo; wala slow message dikhe ya nahi.</p>
          </div>
          <button
            type="button"
            className="db-toggle"
            role="switch"
            aria-checked={settings.calmPrompt}
            aria-label="Calm prompt"
            onClick={() => setSettings({ calmPrompt: !settings.calmPrompt })}
          />
        </div>
        <div className="db-setting-row">
          <div>
            <strong>Caregiver mode</strong>
            <p className="db-muted">Main kisi aur ki madad kar raha/rahi hoon — records par caregiver label lagta hai.</p>
          </div>
          <button
            type="button"
            className="db-toggle"
            role="switch"
            aria-checked={settings.caregiver}
            aria-label="Caregiver mode"
            onClick={() => setSettings({ caregiver: !settings.caregiver })}
          />
        </div>
      </section>

      <section className="db-card" aria-label="Speech settings">
        <h2>Speech</h2>
        <div className="db-setting-row">
          <div>
            <strong>Bolne / sunne ki bhasha</strong>
            <p className="db-muted">Voice recognition aur TTS ki language.</p>
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
            <strong>TTS speed</strong>
            <p className="db-muted">Calm prompt kitni dheere bole — {settings.ttsRate.toFixed(2)}×.</p>
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
        <p className="db-muted">Note: browser speech recognition kabhi-kabhi external service use karta hai — RAKSHIO iska vaada nahi karta ki ye hamesha offline hai.</p>
      </section>

      <section className="db-card" aria-label="Storage">
        <h2>Storage</h2>
        <div className="db-rows">
          <div className="db-row"><span className="k">Local storage (is app ka)</span><span className="v">~{storageKb} KB</span></div>
          <div className="db-row"><span className="k">Evidence Vault entries</span><span className="v">{evidenceCount}</span></div>
          <div className="db-row"><span className="k">Incidents</span><span className="v">{incidents.length}</span></div>
        </div>
        <div>
          <button type="button" className="db-btn db-btn-outline" onClick={exportAll}>
            Sab kuch export karein (JSON)
          </button>
        </div>
      </section>

      {active && (
        <section className="db-card" aria-label="Follow-up Guardian">
          <h2>{t(lang, 'guardianTitle')}</h2>
          <p className="db-muted">Active incident: {active.amount != null ? `₹${active.amount.toLocaleString('en-IN')}` : 'Pata nahi'} — reminders user-reported status par chalte hain.</p>
          <FollowUpList incident={active} />
        </section>
      )}

      <section className="db-card" aria-label="Delete incidents">
        <h2>Incidents delete karein</h2>
        {incidents.length === 0 ? (
          <p className="db-muted">Koi incident nahi hai.</p>
        ) : (
          <div className="db-rows">
            {incidents.map((i) => (
              <div key={i.id} className="db-setting-row">
                <div>
                  <strong>#{i.id.replace(/^rk-/, 'RK-').toUpperCase()}</strong>
                  <p className="db-muted">
                    {i.amount != null ? `₹${i.amount.toLocaleString('en-IN')}` : 'Pata nahi'} · {new Date(i.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button type="button" className="db-btn db-btn-sm db-btn-outline" onClick={() => deleteIncident(i.id)}>
                  Delete karein
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="db-card" aria-label="One-tap wipe">
        <h2>One-tap wipe</h2>
        <p className="db-muted">Sab kuch delete: incidents, settings, ack, follow-ups, Evidence Vault. Ye wapas nahi aata.</p>
        {confirmWipe ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="db-btn db-btn-red" onClick={wipe}>
              Pakka — sab kuch saaf karein
            </button>
            <button type="button" className="db-btn db-btn-outline" onClick={() => setConfirmWipe(false)}>
              Rukiye
            </button>
          </div>
        ) : (
          <div>
            <button type="button" className="db-btn db-btn-red" onClick={() => setConfirmWipe(true)}>
              Sab kuch saaf karein
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
