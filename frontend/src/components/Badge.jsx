const TONE_BY_VALUE = {
  present: 'success',
  connected: 'success',
  available: 'success',
  resolved: 'success',
  'signed-in': 'success',
  active: 'info',
  scheduled: 'info',
  'in-use': 'info',
  pending: 'warning',
  acknowledged: 'warning',
  flagged: 'danger',
  disconnected: 'danger',
  missing: 'danger',
  offline: 'danger',
  absent: 'danger',
  terminated: 'danger',
  maintenance: 'warning',
  open: 'danger',
  'false-alarm': 'default',
  ended: 'default',
  completed: 'default',
  draft: 'default',
  cancelled: 'default',
  'signed-out': 'default',
  low: 'default',
  medium: 'warning',
  high: 'danger'
};

/** Small status pill whose color follows the value's meaning across the app. */
export default function Badge({ value, tone }) {
  const resolvedTone = tone || TONE_BY_VALUE[value] || 'default';
  const className = resolvedTone === 'default' ? 'badge' : `badge badge-${resolvedTone}`;
  return <span className={className}>{String(value ?? '-').replace(/-/g, ' ')}</span>;
}
