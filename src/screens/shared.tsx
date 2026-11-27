import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createListener, recognitionSupported } from '../voice/VoiceAdapter';

// Every Step 2 screen ends with this — a stuck user in a panic app is a bug.
export function BackButton({ onBack }: { onBack: () => void }) {
  return <Button label="Wapas" variant="ghost" size="lg" width="100%" onClick={onBack} />;
}

// The one honest sentence, on every screen. Never hidden, never small.
export function NoReportBanner() {
  return (
    <p className="no-report-banner" role="note">
      RAKSHIO report file nahi karta. Aapko 1930 / bank ko khud contact karna hoga.
    </p>
  );
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

// Engine strings are for code, not for victims. Human-readable Hindi labels.
const FRAUD_TYPE_LABELS: Record<string, string> = {
  'otp-impersonation': 'OTP dhokha (customer care)',
  'digital-arrest': 'Digital arrest dhamki',
  'remote-access': 'Screen share dhokha',
  'qr-scam': 'QR scam',
  'investment-scam': 'Investment dhokha',
  'job-scam': 'Naukri dhokha',
  'phishing-link': 'Fake link / SMS',
  'unauthorised-debit': 'Bina permission debit',
};

export function fraudTypeLabel(t: string | null): string {
  if (!t) return 'Pata nahi';
  return FRAUD_TYPE_LABELS[t] ?? t;
}

const METHOD_LABELS: Record<string, string> = {
  UPI: 'UPI',
  card: 'Card',
  netbanking: 'Net banking',
  wallet: 'Wallet',
};

export function methodLabel(m: string | null): string {
  if (!m) return 'Pata nahi';
  return METHOD_LABELS[m] ?? m;
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
// the region, shapes hidden from assistive tech, no shimmer under
// reduced motion, which the CSS enforces).
export function ScreenSkeleton({ label, hint }: { label: string; hint?: string }) {
  return (
    <section className="rk-card" aria-live="polite" aria-busy="true">
      <h1>{label}</h1>
      <div className="skeleton skeleton-bar skeleton-pulse" aria-hidden="true" />
      <div className="skeleton skeleton-bar skeleton-pulse" aria-hidden="true" />
      <div className="skeleton skeleton-bar skeleton-short skeleton-pulse" aria-hidden="true" />
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
