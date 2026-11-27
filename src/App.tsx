import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Badge } from '@astryxdesign/core/Badge';
import { canGo, type Screen } from './engines/orchestrator/machine';
import { extractIncident, type ExtractedIncident } from './engines/understanding/extract';
import { loadIncident, saveIncident, toStored, wipeIncident, type StoredIncident } from './state/store';
import { recognitionSupported, stopSpeaking } from './voice/VoiceAdapter';
import { DEMO_TRANSCRIPT } from './demo/seed';
import { PanicScreen } from './screens/Panic';
import { ListenScreen } from './screens/Listen';
import { GapsScreen, type GapField } from './screens/Gaps';
import { ConfirmScreen, type ConfirmState } from './screens/Confirm';
import { IncidentScreen } from './screens/Incident';
import { ActionsScreen } from './screens/Actions';
import { CoachScreen } from './screens/Coach';
import { ShieldScreen } from './screens/Shield';
import { TriageScreen } from './screens/Triage';
import { BankKitScreen } from './screens/BankKit';
import { JudgeScreen } from './screens/Judge';
import { AckBridgeScreen } from './screens/AckBridge';
import { formatINR, ScreenSkeleton } from './screens/shared';

// Heavy screens load on demand, not on first paint: Proof pulls pdf-lib +
// JSZip + QR, Vault pulls Dexie, Care pulls QR. Everything else in the
// first-load bundle is the panic path. Suspense shows a skeleton, never
// a blank gap.
const VaultScreen = lazy(() => import('./screens/Vault').then((m) => ({ default: m.VaultScreen })));
const ProofScreen = lazy(() => import('./screens/Proof').then((m) => ({ default: m.ProofScreen })));
const CareScreen = lazy(() => import('./screens/Care').then((m) => ({ default: m.CareScreen })));

gsap.registerPlugin(useGSAP);

function computeGaps(inc: ExtractedIncident): GapField[] {
  const gaps: GapField[] = [];
  if (!inc.amount.value || inc.amount.confidence < 0.7) gaps.push('amount');
  if (!inc.fraudAt.value || inc.fraudAt.confidence < 0.7) gaps.push('fraudAt');
  if (!inc.method.value || inc.method.confidence < 0.7) gaps.push('method');
  return gaps;
}

function summaryText(inc: ExtractedIncident): string {
  const parts = ['Main ye samjha.'];
  parts.push(inc.amount.value != null ? `Rashi ${formatINR(inc.amount.value)}.` : 'Rashi pata nahi.');
  parts.push(inc.fraudAtDisplay.value ? `Samay ${inc.fraudAtDisplay.value}.` : 'Samay pata nahi.');
  parts.push(inc.method.value ? `Tareeka ${inc.method.value}.` : 'Tareeka pata nahi.');
  return parts.join(' ');
}

const EMPTY_CONFIRM: Record<GapField, ConfirmState> = { amount: 'pending', fraudAt: 'pending', method: 'pending' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('panic');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [incident, setIncident] = useState<ExtractedIncident | null>(null);
  const [maskedTranscript, setMaskedTranscript] = useState('');
  const [masked, setMasked] = useState(false);
  const [stored, setStored] = useState<StoredIncident | null>(null);
  const [caregiver, setCaregiver] = useState(false);
  const [gaps, setGaps] = useState<GapField[]>([]);
  const [unknownFields, setUnknownFields] = useState<Set<GapField>>(new Set());
  const [confirmState, setConfirmState] = useState<Record<GapField, ConfirmState>>(EMPTY_CONFIRM);
  const screenRef = useRef<HTMLDivElement>(null);

  // Resume a confirmed incident from this device, if one exists.
  useEffect(() => {
    const prev = loadIncident();
    if (prev && (prev.confirmed.amount || prev.confirmed.fraudAt || prev.confirmed.method)) {
      setStored(prev);
      setScreen('incident');
    }
  }, []);

  // Screen crossfade: 220ms, skipped entirely under reduced motion.
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(screenRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power1.out' });
  }, { dependencies: [screen], scope: screenRef });

  function go(to: Screen) {
    setScreen((from) => (canGo(from, to) ? to : from));
  }

  function handleTranscript(text: string) {
    if (!text.trim()) return;
    const { incident: inc, maskedTranscript: mt, masked: m } = extractIncident(text);
    setIncident(inc);
    setMaskedTranscript(mt);
    setMasked(m);
    setUnknownFields(new Set());
    setConfirmState(EMPTY_CONFIRM);
    go('extracting');
    // A beat of "Samajh raha hoon" so the state change reads as work, not a jump.
    window.setTimeout(() => {
      const g = computeGaps(inc);
      setGaps(g);
      go(g.length > 0 ? 'gaps' : 'confirm');
    }, 700);
  }

  // Gap answers reuse the same deterministic extractor. A bare number-word
  // answer ("bees hazaar") gets a money cue appended, or it would not parse.
  function mergeField(field: GapField, text: string) {
    const cue = field === 'amount' ? `${text} rupaye` : text;
    const { incident: g } = extractIncident(cue);
    setIncident((prev) => {
      if (!prev) return prev;
      if (field === 'amount') return { ...prev, amount: g.amount.value != null ? g.amount : prev.amount };
      if (field === 'fraudAt') return {
        ...prev,
        fraudAt: g.fraudAt.value ? g.fraudAt : prev.fraudAt,
        fraudAtDisplay: g.fraudAtDisplay.value ? g.fraudAtDisplay : prev.fraudAtDisplay,
      };
      return { ...prev, method: g.method.value ? g.method : prev.method };
    });
  }

  function enterConfirm() {
    // Fields the user already said "pata nahi" to arrive pre-resolved.
    setConfirmState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as GapField[]).forEach((f) => {
        if (unknownFields.has(f)) next[f] = 'unknown';
      });
      return next;
    });
    go('confirm');
  }

  function handleConfirmDone() {
    if (!incident) return;
    const s = toStored(incident, maskedTranscript, masked, incident.fraudAt.value, caregiver);
    s.confirmed = {
      amount: confirmState.amount === 'yes',
      fraudAt: confirmState.fraudAt === 'yes',
      method: confirmState.method === 'yes',
    };
    saveIncident(s);
    setStored(s);
    go('incident');
  }

  // Logs only that the call button was tapped — never that the call happened.
  function logCallTap() {
    setStored((prev) => {
      if (!prev) return prev;
      const next = { ...prev, callTappedAt: new Date().toISOString() };
      saveIncident(next);
      return next;
    });
  }

  function resetAll() {
    wipeIncident();
    stopSpeaking();
    setStored(null);
    setIncident(null);
    setTranscript('');
    setInterim('');
    setGaps([]);
    setUnknownFields(new Set());
    setConfirmState(EMPTY_CONFIRM);
    setScreen('panic');
  }

  return (
    <>
      <header className="app-header">
        <div>
          <div className="wordmark">RAKSHIO</div>
          <div className="tagline">Panic me bhi, sahi kadam.</div>
        </div>
        {caregiver && <Badge label="Caregiver mode" variant="success" />}
      </header>

      <main className="app-main">
        <div ref={screenRef} className="screen-stack">
          {screen === 'panic' && (
            <PanicScreen
              voiceSupported={recognitionSupported()}
              caregiver={caregiver}
              onCaregiverChange={setCaregiver}
              onStartVoice={() => { setMode('voice'); go('listen'); }}
              onStartText={() => { setMode('text'); go('listen'); }}
              onDemo={() => handleTranscript(DEMO_TRANSCRIPT)}
              onJudge={() => go('judge')}
              onCall1930={logCallTap}
            />
          )}
          {screen === 'listen' && (
            <ListenScreen
              mode={mode}
              finalText={transcript}
              interimText={interim}
              onFinal={setTranscript}
              onInterim={setInterim}
              onStop={(t) => handleTranscript(t || transcript)}
              onTextSubmit={handleTranscript}
              onBack={() => go('panic')}
            />
          )}
          {screen === 'extracting' && (
            <ScreenSkeleton label="Samajh raha hoon…" hint="Aapki baat se rashi, samay aur tareeka nikaal raha hoon. Kuch second lagega." />
          )}
          {screen === 'gaps' && (
            <GapsScreen
              gaps={gaps}
              onAnswer={mergeField}
              onSkip={(f) => setUnknownFields((prev) => new Set(prev).add(f))}
              onDone={enterConfirm}
            />
          )}
          {screen === 'confirm' && incident && (
            <ConfirmScreen
              incident={incident}
              confirmState={confirmState}
              summaryText={summaryText(incident)}
              onResolve={(f, r) => setConfirmState((prev) => ({ ...prev, [f]: r }))}
              onCorrect={(f, text) => { mergeField(f, text); setConfirmState((prev) => ({ ...prev, [f]: 'pending' })); }}
              onReopen={(f) => setConfirmState((prev) => ({ ...prev, [f]: 'pending' }))}
              onDone={handleConfirmDone}
            />
          )}
          {screen === 'incident' && stored && (
            <IncidentScreen stored={stored} onActions={() => go('actions')} onTool={(s) => go(s)} onReset={resetAll} />
          )}
          {screen === 'actions' && stored && (
            <ActionsScreen stored={stored} onOpenCoach={() => go('coach')} onTool={(s) => go(s)} onBack={() => go('incident')} />
          )}
          {screen === 'coach' && stored && (
            <CoachScreen stored={stored} onCallTap={logCallTap} onDone={logCallTap} onOpenAck={() => go('ack')} onBack={() => go('actions')} />
          )}
          {screen === 'vault' && stored && <Suspense fallback={<ScreenSkeleton label="Evidence Vault khul raha hai…" />}><VaultScreen stored={stored} caregiver={caregiver} onBack={() => go('incident')} /></Suspense>}
          {screen === 'shield' && <ShieldScreen onBack={() => go('incident')} />}
          {screen === 'triage' && stored && <TriageScreen stored={stored} onBack={() => go('incident')} />}
          {screen === 'bank' && stored && <BankKitScreen stored={stored} onBack={() => go('incident')} />}
          {screen === 'care' && stored && <Suspense fallback={<ScreenSkeleton label="Care Circle khul raha hai…" />}><CareScreen stored={stored} onBack={() => go('incident')} /></Suspense>}
          {screen === 'proof' && stored && <Suspense fallback={<ScreenSkeleton label="Proof Pack khul raha hai…" />}><ProofScreen stored={stored} onBack={() => go('incident')} /></Suspense>}
          {screen === 'judge' && <JudgeScreen onStart={() => handleTranscript(DEMO_TRANSCRIPT)} />}
          {screen === 'ack' && stored && <AckBridgeScreen stored={stored} onBack={() => go('incident')} />}
        </div>
      </main>

      <footer className="app-footer">
        RAKSHIO kabhi OTP / PIN / CVV nahi mangta. Aapka data sirf is phone par rehta hai.
      </footer>
    </>
  );
}
