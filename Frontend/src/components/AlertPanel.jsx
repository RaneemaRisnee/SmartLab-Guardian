import { useEffect, useState } from 'react';
import { fetchAlerts, resolveAlert, openAlertStream } from '../services/alertService';
import '../App.css';

const FALLBACK_REFRESH_MS = 30000; // safety-net refresh; live updates arrive instantly via SSE

export default function AlertPanel({ adminId = null }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0); // bump to reload immediately (after Reviewed / Dismissed)

  useEffect(() => {
    let active = true; // ignore responses that arrive after the component is gone

    const load = async () => {
      try {
        const data = await fetchAlerts();
        if (active) {
          setAlerts(data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message || 'Cannot reach the server');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    // Server pushes an event only when an alert is created/resolved -> reload then.
    const stream = openAlertStream(load);
    // Slow fallback in case the stream is blocked by a proxy or drops silently.
    const timer = setInterval(load, FALLBACK_REFRESH_MS);
    return () => {
      active = false;
      stream.close();
      clearInterval(timer);
    };
  }, [refreshKey]);

  const handleAction = async (id, status) => {
    try {
      await resolveAlert(id, status, adminId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingCount = alerts.filter((a) => a.resolved_status === 'Pending').length;

  return (
    <div className="dashboard-container">
      <div className="alert-card">
        <div className="alert-header">
          <h2 className="alert-title">
            <span>🚨</span> Hardware Removal Monitor
          </h2>
          {pendingCount > 0 && (
            <span className="badge-count">
              {pendingCount} Critical Alert{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {error && <div className="error-banner">⚠ {error} (retrying automatically)</div>}

        <div className="table-wrap">
          <table className="alert-table">
            <thead>
              <tr>
                <th>PC</th>
                <th>Device</th>
                <th>Type</th>
                <th>Removal Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="empty-cell">Loading…</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan="6" className="empty-cell">No hardware disconnections detected.</td></tr>
              ) : (
                alerts.map((alert) => {
                  const status = alert.resolved_status;
                  const when = new Date(alert.removal_time);
                  return (
                    <tr key={alert._id} className={status === 'Pending' ? 'row-pending' : 'row-reviewed'}>
                      <td><b>{alert.pc_id}</b></td>
                      <td title={alert.hardware_id}><strong>{alert.device_name}</strong></td>
                      <td>{alert.device_type || '-'}</td>
                      <td>{when.toLocaleDateString()} {when.toLocaleTimeString()}</td>
                      <td><span className={`status-pill ${status.toLowerCase()}`}>{status}</span></td>
                      <td>
                        {status === 'Pending' ? (
                          <>
                            <button className="btn-resolve" onClick={() => handleAction(alert._id, 'Reviewed')}>
                              Mark Reviewed
                            </button>{' '}
                            <button className="btn-dismiss" onClick={() => handleAction(alert._id, 'Dismissed')}>
                              Dismiss
                            </button>
                          </>
                        ) : (
                          <span className="done-text">✓ {status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
