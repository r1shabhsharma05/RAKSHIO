import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { t, type Lang } from '../i18n';
import { createListener, recognitionSupported } from '../voice/VoiceAdapter';

// Every Step 2 screen ends with this — a stuck user in a panic app is a bug.
export function BackButton({ onBack }: { onBack: () => void }) {
  return <Button label="Wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />;
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

// Step 16 (bug 2): the label follows the selected language (default 'hg'
// = the old Hinglish text, so old callers don't change behaviour).
const FRAUD_TYPE_KEYS: Record<string, 'ftOtp' | 'ftDigitalArrest' | 'ftRemoteAccess' | 'ftQr' | 'ftInvestment' | 'ftJob' | 'ftPhishing' | 'ftDebit'> = {
  'otp-impersonation': 'ftOtp',
  'digital-arrest': 'ftDigitalArrest',
  'remote-access': 'ftRemoteAccess',
  'qr-scam': 'ftQr',
  'investment-scam': 'ftInvestment',
  'job-scam': 'ftJob',
  'phishing-link': 'ftPhishing',
  'unauthorised-debit': 'ftDebit',
};

export function fraudTypeLabel(type: string | null, lang: Lang = 'hg'): string {
  if (!type) return t(lang, 'confirmUnknown');
  const key = FRAUD_TYPE_KEYS[type];
  return key ? t(lang, key) : type;
}

const METHOD_KEYS: Record<string, 'methodUpi' | 'methodCard' | 'methodNetbanking' | 'methodWallet'> = {
  UPI: 'methodUpi',
  card: 'methodCard',
  netbanking: 'methodNetbanking',
  wallet: 'methodWallet',
};

export function methodLabel(m: string | null, lang: Lang = 'hg'): string {
  if (!m) return t(lang, 'confirmUnknown');
  const key = METHOD_KEYS[m];
  return key ? t(lang, key) : m;
}

// Copy with a fallback: the async clipboard API is missing in older
// browsers and some in-app webviews — the execCommand path still works
// there. Returns false only when nothing could copy.
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Inline SVG mic — text labels and SVG marks, never emoji as UI icons.
export function MicIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Loading placeholder for lazy screens and the Extracting step: static
// bars that reserve the layout (ui-motion-kit skeleton meta — aria-busy on
// the region, shapes hidden from assistive tech). Static on purpose: the
// bars mark loading, a shimmer loop would be motion with no job.
export function ScreenSkeleton({ label, hint }: { label: string; hint?: string }) {
  return (
    <section className="rk-card" aria-live="polite" aria-busy="true">
      <h2>{label}</h2>
      <div className="skeleton skeleton-bar" aria-hidden="true" />
      <div className="skeleton skeleton-bar" aria-hidden="true" />
      <div className="skeleton skeleton-bar skeleton-short" aria-hidden="true" />
      {hint && <p>{hint}</p>}
    </section>
  );
}

// Text field with an optional mic toggle. The mic only appears when the
// browser actually supports recognition — never a dead mic button.
export function VoiceInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const supported = recognitionSupported();
  const [listening, setListening] = useState(false);
  const listenerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => () => listenerRef.current?.stop(), []);

  function toggleListen() {
    if (listening) {
      listenerRef.current?.stop();
      setListening(false);
      return;
    }
    try {
      const l = createListener('hi-IN', {
        onFinal: (t) => onChange(t),
        onInterim: () => undefined,
        onError: () => setListening(false),
      });
      listenerRef.current = l;
      l.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <div className="field-col">
      <label htmlFor={`vi-${label}`} className="rk-label">{label}</label>
      <textarea
        id={`vi-${label}`}
        className="rk-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {supported && (
        <button type="button" className="mic-btn mic-btn-sm" onClick={toggleListen} aria-pressed={listening}>
          <MicIcon size={28} />
          <span className="mic-label">{listening ? 'Rukiye' : 'Boliye'}</span>
        </button>
      )}
    </div>
  );
}
