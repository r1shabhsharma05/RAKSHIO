// The flow is one small finite state machine: every screen is a state, and
// only the transitions below are allowed, so a screen can never be skipped
// into (e.g. the incident card cannot open before confirmation).
export type Screen =
  | 'panic'
  | 'listen'
  | 'extracting'
  | 'gaps'
  | 'confirm'
  | 'incident'
  | 'actions'
  | 'coach'
  | 'vault'
  | 'shield'
  | 'triage'
  | 'bank'
  | 'care'
  | 'proof'
  | 'judge'
  | 'ack';

const TRANSITIONS: Record<Screen, Screen[]> = {
  // Panic can jump straight to extracting via the demo aid / Judge Mode.
  panic: ['listen', 'actions', 'extracting', 'judge'],
  listen: ['extracting', 'panic'],
  extracting: ['gaps', 'confirm', 'panic'],
  gaps: ['confirm', 'panic'],
  confirm: ['incident', 'gaps', 'panic'],
  incident: ['actions', 'panic', 'vault', 'shield', 'triage', 'bank', 'care', 'proof', 'ack'],
  actions: ['coach', 'incident', 'panic', 'ack', 'bank', 'vault', 'care'],
  coach: ['actions', 'panic', 'ack'],
  vault: ['incident', 'panic'],
  shield: ['incident', 'panic'],
  triage: ['incident', 'panic'],
  bank: ['incident', 'panic'],
  care: ['incident', 'panic'],
  proof: ['incident', 'panic'],
  judge: ['extracting', 'incident', 'panic'],
  ack: ['incident', 'actions', 'panic'],
};

export function canGo(from: Screen, to: Screen): boolean {
  return TRANSITIONS[from].includes(to);
}
