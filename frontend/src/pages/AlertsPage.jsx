import { useState } from 'react';
import { listAlerts, alertSummary, updateAlertStatus } from '../api/alerts';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { formatDateTime } from '../utils/format';

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: summary, reload: reloadSummary } = useAsync(alertSummary, []);
  const { data, loading, error, reload } = useAsync(
    () => listAlerts({ page, limit: 20, status: status || undefined }),
    [page, status]
  );

  const refreshAll = () => {
    reload();
    reloadSummary();
  };

  const respond = async (id, newStatus) => {
    if (newStatus !== 'acknowledged') {
      setResolving({ id, status: newStatus });
      return;
    }
    try {
      await updateAlertStatus(id, { status: newStatus });
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const confirmResolve = async () => {
    setBusy(true);
    setActionError('');
    try {
      await updateAlertStatus(resolving.id, { status: resolving.status, resolutionNote: note });
      setResolving(null);
      setNote('');
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Hardware Removal Alerts" />
      <div className="page-content">
        {summary && (
          <div className="grid grid-stats" style={{ marginBottom: 20 }}>
            <StatCard label="Open" value={summary.byStatus.open || 0} accent="danger" />
            <StatCard label="Acknowledged" value={summary.byStatus.acknowledged || 0} accent="warning" />
            <StatCard label="Resolved" value={summary.byStatus.resolved || 0} accent="success" />
            <StatCard label="False alarms" value={summary.byStatus['false-alarm'] || 0} />
            <StatCard label="High severity open" value={summary.openBySeverity.high || 0} accent="danger" />
          </div>
        )}

        <div className="toolbar">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="false-alarm">False alarm</option>
              <option value="">All</option>
            </select>
          </div>
          <button className="btn btn-sm" onClick={refreshAll} style={{ marginLeft: 'auto' }}>Refresh</button>
        </div>

        <AlertBanner>{error || actionError}</AlertBanner>

        <div className="card">
          {loading && !data ? (
            <Spinner />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PC</th>
                      <th>Device</th>
                      <th>Removed at</th>
                      <th>Severity</th>
                      <th>Active student</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((a) => (
                      <tr key={a._id}>
                        <td>{a.computer?.pcNumber}</td>
                        <td>{a.deviceLabel || a.hardwareDevice?.hardwareId} ({a.deviceType})</td>
                        <td>{formatDateTime(a.removalTime)}</td>
                        <td><Badge value={a.severity} /></td>
                        <td>{a.activeSessionStudent?.regNo || '-'}</td>
                        <td><Badge value={a.status} /></td>
                        <td className="btn-row">
                          {a.status === 'open' && (
                            <button className="btn btn-sm" onClick={() => respond(a._id, 'acknowledged')}>Acknowledge</button>
                          )}
                          {a.status !== 'resolved' && (
                            <button className="btn btn-sm btn-danger" onClick={() => respond(a._id, 'resolved')}>Resolve</button>
                          )}
                          {a.status !== 'false-alarm' && (
                            <button className="btn btn-sm" onClick={() => respond(a._id, 'false-alarm')}>False alarm</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr><td colSpan={7} className="empty-state">No alerts match this filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={data?.pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {resolving && (
        <Modal
          title={resolving.status === 'resolved' ? 'Resolve alert' : 'Mark as false alarm'}
          onClose={() => setResolving(null)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setResolving(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={confirmResolve}>Confirm</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="field">
            <label>Note</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                resolving.status === 'resolved'
                  ? 'e.g. Confirmed missing, reported to stores'
                  : 'e.g. Device was reconnected, false alarm'
              }
            />
          </div>
        </Modal>
      )}
    </>
  );
}
