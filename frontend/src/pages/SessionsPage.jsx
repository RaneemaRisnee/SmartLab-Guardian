import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, endSession } from '../api/sessions';
import { listLabs } from '../api/labs';
import { finishMonitoringSession, listMonitoringSessions, startMonitoringSession } from '../api/monitoringSessions';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import { formatDateTime, formatMinutes, riskColor } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function SessionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [lab, setLab] = useState('');
  const [actionError, setActionError] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [monitoringBusy, setMonitoringBusy] = useState(false);
  const [monitoringLab, setMonitoringLab] = useState('');

  const { data: labs } = useAsync(listLabs, []);
  const { data: monitoringSessions, reload: reloadMonitoringSessions } = useAsync(listMonitoringSessions, []);

  const { data, loading, error, reload } = useAsync(
    () =>
      listSessions({
        page,
        limit: 20,
        status: status || undefined,
        flagged: flaggedOnly ? 'true' : undefined,
        lab: lab || undefined
      }),
    [page, status, flaggedOnly, lab]
  );

  const canManage = ['admin', 'lecturer', 'examiner'].includes(user?.role);

  const handleStartMonitoring = async () => {
    if (!monitoringLab) {
      setActionError('Select a lab to start monitoring.');
      return;
    }
    setMonitoringBusy(true);
    setActionError('');
    try {
      await startMonitoringSession({ lab: monitoringLab });
      setMonitoringLab('');
      reloadMonitoringSessions();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMonitoringBusy(false);
    }
  };

  const handleFinishMonitoring = async (id) => {
    if (!window.confirm('Finish this monitoring session? Student and computer data already received from agents will remain available in Reports.')) return;
    setMonitoringBusy(true);
    setActionError('');
    try {
      await finishMonitoringSession(id);
      reloadMonitoringSessions();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setMonitoringBusy(false);
    }
  };

  const handleEnd = async (id) => {
    setActionError('');
    try {
      await endSession(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Live &amp; Session History"
        actions={canManage && <div className="btn-row">
          <select value={monitoringLab} onChange={(e) => setMonitoringLab(e.target.value)} aria-label="Monitoring lab">
            <option value="">Select lab</option>
            {labs?.map((item) => <option key={item._id} value={item._id}>{item.code}</option>)}
          </select>
          <button className="btn btn-sm btn-primary" disabled={monitoringBusy || !monitoringLab} onClick={handleStartMonitoring}>
            {monitoringBusy ? 'Starting…' : 'Start monitoring'}
          </button>
        </div>}
      />
      <div className="page-content">
        <div className="toolbar">
          <div className="field">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="active">Active only</option>
              <option value="ended">Ended</option>
              <option value="terminated">Terminated</option>
              <option value="">All</option>
            </select>
          </div>
          <div className="field">
            <label>Lab</label>
            <select
              value={lab}
              onChange={(e) => {
                setLab(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All labs</option>
              {labs?.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => {
                  setFlaggedOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Flagged only
            </label>
          </div>
          <button className="btn btn-sm" onClick={reload} style={{ marginLeft: 'auto' }}>
            Refresh
          </button>
        </div>

        <AlertBanner>{error || actionError}</AlertBanner>
        {!!monitoringSessions?.filter((item) => item.status === 'active').length && (
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Active monitoring sessions</h3>
            {monitoringSessions.filter((item) => item.status === 'active').map((item) => (
              <div key={item._id} className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span><strong>{item.lab?.code}</strong> started {formatDateTime(item.startedAt)} by {item.startedBy?.name}</span>
                {canManage && <button className="btn btn-sm btn-danger" disabled={monitoringBusy} onClick={() => handleFinishMonitoring(item._id)}>Finish session</button>}
              </div>
            ))}
            <p className="text-sm text-muted" style={{ marginBottom: 0 }}>Student names and PC assignments will appear automatically when the monitoring agents report them.</p>
          </div>
        )}

        <div className="card">
          {loading && !data ? (
            <Spinner />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>PC</th>
                      <th>Lab</th>
                      <th>Type</th>
                      <th>Login</th>
                      <th>Active time</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((s) => (
                      <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sessions/${s._id}`)}>
                        <td>
                          <div>{s.student?.name}</div>
                          <div className="text-sm text-muted">{s.student?.regNo}</div>
                        </td>
                        <td>{s.computer?.pcNumber}</td>
                        <td>{s.lab?.code}</td>
                        <td>
                          <Badge value={s.sessionType} tone={s.sessionType === 'exam' ? 'info' : 'default'} />
                        </td>
                        <td>{formatDateTime(s.loginTime)}</td>
                        <td>{formatMinutes(Math.round(s.activeSeconds / 60))}</td>
                        <td>
                          <Badge value={s.flagged ? 'flagged' : s.status} />
                        </td>
                        <td>
                          <div className="risk-bar-track">
                            <div
                              className="risk-bar-fill"
                              style={{ width: `${s.riskScore}%`, background: riskColor(s.riskScore) }}
                            />
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {canManage && s.status === 'active' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleEnd(s._id)}>
                              End
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr>
                        <td colSpan={9} className="empty-state">
                          No sessions match these filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={data?.pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
