import { Button } from '@astryxdesign/core/Button';
import { NoReportBanner } from './shared';

// Judge Mode: the seeded ₹20,000 UPI scenario in one button, no mic needed.
// For the demo: run it, then check each item below.
export function JudgeScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <NoReportBanner />
      <h1>Judge Mode</h1>
      <p>Mic ki zaroorat nahi — ek button se seeded ₹20,000 UPI scenario chalta hai.</p>
      <Button label="Seeded scenario chalao (₹20,000 UPI)" variant="secondary" size="lg" width="100%" onClick={onStart} />
      <section className="rk-card">
        <h2>Demo me ye check karein</h2>
        <ul>
          <li>Incident card: rashi ₹20,000, HDFC, UPI, UTR — confirm ke baad lock hota hai.</li>
          <li>Golden Hour Clock: 1930 / portal / bank deadlines live ghatte hain.</li>
          <li>Evidence Vault: entry jodein, Verify green — Tamper Test se red.</li>
          <li>Second-Scam Shield: "recovery agent" message paste karein — Truth Card red.</li>
          <li>1930 Call Coach: script me confirmed facts aate hain.</li>
          <li>Proof Pack: PDF/ZIP download hota hai.</li>
        </ul>
      </section>
      <p style={{ fontSize: '0.875rem' }}>Judge Mode sirf demo ke liye hai — asli incident Panic screen se shuru karein.</p>
    </>
  );
}
