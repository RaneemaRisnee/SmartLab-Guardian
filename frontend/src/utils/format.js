export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatMinutes(minutes) {
  if (minutes === undefined || minutes === null) return '-';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `${hours}h ${rest}m`;
}

export function riskColor(score) {
  if (score >= 60) return '#c62b3a';
  if (score >= 30) return '#b5750b';
  return '#12805c';
}

/** Local <input type="date"> value (YYYY-MM-DD) for a given Date, defaulting to today. */
export function toDateInput(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
