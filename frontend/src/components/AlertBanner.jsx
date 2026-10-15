export default function AlertBanner({ type = 'error', children }) {
  if (!children) return null;
  return <div className={`alert-banner ${type}`}>{children}</div>;
}
