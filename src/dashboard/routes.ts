import type { Screen } from '../engines/orchestrator/machine';

// Old flow screens -> dashboard routes. The tool screens keep their
// component; only the navigation changes (router instead of the machine).
export function screenToPath(s: Screen, incidentId?: string | null): string {
  switch (s) {
    case 'panic':
    case 'listen':
    case 'extracting':
    case 'gaps':
    case 'confirm':
    case 'judge':
      return '/report';
    case 'incident':
      return incidentId ? `/incidents/${incidentId}` : '/incidents';
    case 'actions':
      return '/actions';
    case 'coach':
      return '/coach';
    case 'vault':
      return '/vault';
    case 'shield':
      return '/shield';
    case 'triage':
      return '/triage';
    case 'bank':
      return '/bank';
    case 'care':
      return '/care';
    case 'proof':
      return '/proof';
    case 'ack':
      return '/portal';
  }
}
