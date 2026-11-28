import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { canGo, type Screen } from '../engines/orchestrator/machine';
import { extractIncident, type ExtractedIncident } from '../engines/understanding/extract';
import { toStored } from '../state/store';
import { useDashboard } from '../state/dashboardStore';
import { recognitionSupported, stopSpeaking } from '../voice/VoiceAdapter';
import { DEMO_TRANSCRIPT, makeDemoFresh } from '../demo/seed';
import { PanicScreen } from '../screens/Panic';
import { ListenScreen } from '../screens/Listen';
import { GapsScreen, type GapField } from '../screens/Gaps';
import { ConfirmScreen, type ConfirmState } from '../screens/Confirm';
import { JudgeScreen } from '../screens/Judge';
import { formatINR, methodLabel, ScreenSkeleton } from '../screens/shared';
import { t, whenText, type Lang } from '../i18n';

gsap.registerPlugin(useGSAP);

// Exported for the Step 16 unit test: the confirm gate must ask Bank.
export function computeGaps(inc: ExtractedIncident): GapField[] {
  const gaps: GapField[] = [];
  if (!inc.amount.value || inc.amount.confidence < 0.7) gaps.push('amount');
  if (!inc.fraudAt.value || inc.fraudAt.confidence < 0.7) gaps.push('fraudAt');
  if (!inc.method.value || inc.method.confidence < 0.7) gaps.push('method');
  if (!inc.bank.value || inc.bank.confidence < 0.7) gaps.push('bank');
  // Step 19 (A4): OTP sharing was never asked — the Step 18 OTP alert was
  // reachable only if the user volunteered a matching phrase. Ask whenever
  // sharing was not detected, so the alert and the Copy Deck OTP line are
  // reachable through the guided flow.
  if (!inc.credentialShared) gaps.push('otp');
  return gaps;
}

// Step 17: the read-back summary follows the UI language — it is spoken
// aloud by TTS on the Confirm screen, so Hinglish here would be heard in
// English mode. The default 'hg' keeps the exact old wording.
function summaryText(inc: ExtractedIncident, lang: Lang): string {
  const parts = [t(lang, 'reportSumLead')];
  parts.push(inc.amount.value != null ? `${t(lang, 'reportSumAmount')} ${formatINR(inc.amount.value)}.` : `${t(lang, 'reportSumAmount')} ${t(lang, 'unknown')}.`);
  const when = inc.fraudAt.value || inc.fraudAtDisplay.value ? whenText(inc.fraudAt.value, inc.fraudAtDisplay.value, lang) : null;
  parts.push(when ? `${t(lang, 'reportSumWhen')} ${when}.` : `${t(lang, 'reportSumWhen')} ${t(lang, 'unknown')}.`);
  parts.push(inc.method.value ? `${t(lang, 'reportSumMethod')} ${methodLabel(inc.method.value, lang)}.` : `${t(lang, 'reportSumMethod')} ${t(lang, 'unknown')}.`);
  parts.push(inc.bank.value ? `${t(lang, 'reportSumBank')} ${inc.bank.value}.` : `${t(lang, 'reportSumBank')} ${t(lang, 'unknown')}.`);
  return parts.join(' ');
}

const EMPTY_CONFIRM: Record<ConfirmField, ConfirmState> = { amount: 'pending', fraudAt: 'pending', method: 'pending', bank: 'pending' };

// The confirm gate covers four fields; the gaps list can also ask about
// OTP sharing (GapField 'otp'), which is answered in the gaps screen and
// never reaches the confirm gate.
type ConfirmField = 'amount' | 'fraudAt' | 'method' | 'bank';

// The victim's first touch, unchanged from Steps 1–5 — only the shell
// around it is new. /report always starts a fresh report at Panic.
// ?mode=voice|text (from the Home hero) jumps straight into Listen.
export function ReportFlow() {
  const [screen, setScreen] = useState<Screen>('panic');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [incident, setIncident] = useState<ExtractedIncident | null>(null);
  const [maskedTranscript, setMaskedTranscript] = useState('');
  const [masked, setMasked] = useState(false);
  const [gaps, setGaps] = useState<GapField[]>([]);
  const [unknownFields, setUnknownFields] = useState<Set<GapField>>(new Set());
  const [confirmState, setConfirmState] = useState<Record<ConfirmField, ConfirmState>>(EMPTY_CONFIRM);
  const screenRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  // Step 21 (D4): the demo transcript takes the confirm path too — remember
  // it came from the demo so the stored incident is made fresh + fictional.
  const demoRef = useRef(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const settings = useDashboard((s) => s.settings);
  const setSettings = useDashboard((s) => s.setSettings);
  const addIncident = useDashboard((s) => s.addIncident);
  // Step 19 (A1): the #/report Judge confirm must name the active
  // incident — JudgeScreen defaults `active` to undefined without it.
  const active = useDashboard((s) => s.active());

  // Hero deep-link: ?mode=voice jumps straight to the mic, once.
  useEffect(() => {
    if (autoStarted.current) return;
    const m = params.get('mode');
    if (m === 'voice' || m === 'text') {
      autoStarted.current = true;
      setMode(m);
      setScreen('listen');
    }
  }, [params]);

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
    demoRef.current = text.trim() === DEMO_TRANSCRIPT;
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
    // Step 19 (A4): the OTP answer is a yes/no, not text to extract.
    if (field === 'otp') {
      const yes = /^(yes|haan|ha|ji|true)$/i.test(text.trim());
      setIncident((prev) => (prev ? { ...prev, credentialShared: yes } : prev));
      return;
    }
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
      if (field === 'bank') return { ...prev, bank: g.bank.value ? g.bank : prev.bank };
      return { ...prev, method: g.method.value ? g.method : prev.method };
    });
  }

  function enterConfirm() {
    // Fields the user already said "pata nahi" to arrive pre-resolved.
    setConfirmState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as ConfirmField[]).forEach((f) => {
        if (unknownFields.has(f)) next[f] = 'unknown';
      });
      return next;
    });
    go('confirm');
  }

  function handleConfirmDone() {
    if (!incident) return;
    const isDemo = demoRef.current;
    let s = toStored(incident, maskedTranscript, masked, incident.fraudAt.value, settings.caregiver);
    // Step 21 (D4): the in-flow demo seed is also 20 minutes old and
    // marked fictional — never yesterday's stale clock.
    if (isDemo) s = makeDemoFresh(s);
    s.confirmed = {
      amount: confirmState.amount === 'yes',
      fraudAt: confirmState.fraudAt === 'yes',
      method: confirmState.method === 'yes',
      bank: confirmState.bank === 'yes',
    };
    s.status = 'reported';
    addIncident(s, isDemo ? { demo: true } : undefined);
    navigate(`/incidents/${s.id}`);
  }

  function resetAll() {
    stopSpeaking();
    demoRef.current = false;
    setIncident(null);
    setTranscript('');
    setInterim('');
    setGaps([]);
    setUnknownFields(new Set());
    setConfirmState(EMPTY_CONFIRM);
    setScreen('panic');
  }

  return (
    <div className="db-flow">
      <div ref={screenRef} className="screen-stack">
        {screen === 'panic' && (
          <PanicScreen
            voiceSupported={recognitionSupported()}
            caregiver={settings.caregiver}
            onCaregiverChange={(v) => setSettings({ caregiver: v })}
            showCalm={settings.calmPrompt}
            ttsRate={settings.ttsRate}
            onStartVoice={() => { setMode('voice'); go('listen'); }}
            onStartText={() => { setMode('text'); go('listen'); }}
            onDemo={() => handleTranscript(DEMO_TRANSCRIPT)}
            onJudge={() => go('judge')}
            onCall1930={() => undefined}
          />
        )}
        {screen === 'listen' && (
          <ListenScreen
            mode={mode}
            speechLang={settings.speechLang}
            finalText={transcript}
            interimText={interim}
            onFinal={setTranscript}
            onInterim={setInterim}
            onStop={(t) => handleTranscript(t || transcript)}
            onTextSubmit={handleTranscript}
            onTextMode={() => setMode('text')}
            onBack={() => go('panic')}
          />
        )}
        {screen === 'extracting' && (
          <ScreenSkeleton label={t(settings.language, 'reportExtracting')} hint={t(settings.language, 'reportExtractingHint')} />
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
            summaryText={summaryText(incident, settings.language)}
            onResolve={(f, r) => setConfirmState((prev) => ({ ...prev, [f]: r }))}
            onCorrect={(f, text) => { mergeField(f, text); setConfirmState((prev) => ({ ...prev, [f]: 'pending' })); }}
            onReopen={(f) => setConfirmState((prev) => ({ ...prev, [f]: 'pending' }))}
            onDone={handleConfirmDone}
          />
        )}
        {screen === 'judge' && <JudgeScreen showTitle active={active ? { id: `#${active.id.replace(/^rk-/, 'RK-').toUpperCase()}`, amount: active.amount != null ? formatINR(active.amount) : '—' } : null} rawId={active?.id ?? null} onStart={() => handleTranscript(DEMO_TRANSCRIPT)} onBack={() => go('panic')} />}
      </div>
      {screen !== 'panic' && (
        <button type="button" className="demo-link" onClick={resetAll}>{t(settings.language, 'reportStartNew')}</button>
      )}
    </div>
  );
}
