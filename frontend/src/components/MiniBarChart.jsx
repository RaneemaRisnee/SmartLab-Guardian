/**
 * Small dependency-free bar chart for the weekly session trend. Each bar
 * splits into a flagged (red) portion stacked on the clean (blue) portion,
 * scaled against the busiest day in the series.
 */
export default function MiniBarChart({ data }) {
  if (!data || !data.length) return <div className="empty-state">No activity yet this week</div>;

  const max = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="mini-bar-chart">
      {data.map((d) => {
        const total = Math.max((d.sessions / max) * 100, 2);
        const flaggedShare = d.sessions ? (d.flagged / d.sessions) * total : 0;
        const cleanShare = total - flaggedShare;
        const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });

        return (
          <div className="bar-col" key={d.date} title={`${d.date}: ${d.sessions} sessions, ${d.flagged} flagged`}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', height: 90 }}>
              <div className="bar" style={{ height: `${cleanShare}%` }} />
              {flaggedShare > 0 && (
                <div className="bar flagged-overlay" style={{ height: `${flaggedShare}%` }} />
              )}
            </div>
            <span className="bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
