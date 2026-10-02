import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession, endSession, reviewSession } from '../api/sessions';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import { formatDateTime, formatMinutes, riskColor } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => getSession(id), [id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const canManage = ['admin', 'lecturer', 'examiner'].includes(user?.role);
  const canReview = ['admin', 'lecturer'].includes(user?.role);

  const handleEnd = async () => {
    setBusy(true);
    setActionError('');
    try {
      await endSession(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (clearFlag) => {
    setBusy(true);
    setActionError('');
    try {
      await reviewSession(id, { note, clearFlag });
      setNote('');
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <AlertBanner>{error}</AlertBanner>;

  const { session, applicationTotals, websites } = data;

  return (
    <>
      <PageHeader
        title={`Session - ${session.student?.name}`}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => navigate(-1)}>
              Back
            </button>
            {canManage && session.status === 'active' && (
              <button className="btn btn-sm btn-danger" disabled={busy} onClick={handleEnd}>
                End session
              </button>
            )}
          </>
        }
      />
      <div className="page-content">
        <AlertBanner>{error || actionError}</AlertBanner>

        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <div className="card card-pad">
            <dl className="kv-grid">
              <div>
                <dt>Student</dt>
                <dd>
                  {session.student?.name} ({session.student?.regNo})
                </dd>
              </div>
              <div>
                <dt>Computer</dt>
                <dd>
                  {session.computer?.pcNumber} &middot; {session.lab?.code}
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>
                  <Badge value={session.sessionType} />
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge value={session.flagged ? 'flagged' : session.status} />
                </dd>
              </div>
              <div>
                <dt>Login</dt>
                <dd>{formatDateTime(session.loginTime)}</dd>
              </div>
              <div>
                <dt>Logout</dt>
                <dd>{session.logoutTime ? formatDateTime(session.logoutTime) : 'Still active'}</dd>
              </div>
              <div>
                <dt>Active time</dt>
                <dd>{formatMinutes(Math.round(session.activeSeconds / 60))}</dd>
              </div>
              <div>
                <dt>Idle time</dt>
                <dd>{formatMinutes(Math.round(session.idleSeconds / 60))}</dd>
              </div>
            </dl>
          </div>

          <div className="card card-pad">
            <div className="section-title">Risk score: {session.riskScore}/100</div>
            <div className="risk-bar-track" style={{ width: '100%', height: 10, marginBottom: 12 }}>
              <div
                className="risk-bar-fill"
                style={{ width: `${session.riskScore}%`, background: riskColor(session.riskScore) }}
              />
            </div>
            {session.flagReasons?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {session.flagReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">No misuse indicators for this session.</p>
            )}

            {canReview && (
              <div style={{ marginTop: 16 }}>
                <div className="field">
                  <label>Review note</label>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-sm" disabled={busy} onClick={() => handleReview(false)}>
                    Save note
                  </button>
                  {session.flagged && (
                    <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => handleReview(true)}>
                      Clear flag
                    </button>
                  )}
                </div>
                {session.reviewedBy && (
                  <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                    Last reviewed by {session.reviewedBy.name} - {session.reviewNote || 'no note'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h3>Application usage</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {applicationTotals.map((a) => (
                    <tr key={a.appName}>
                      <td>{a.appName}</td>
                      <td>{formatMinutes(Math.round(a.seconds / 60))}</td>
                      <td>{a.blocked && <Badge value="blocked" tone="danger" />}</td>
                    </tr>
                  ))}
                  {!applicationTotals.length && (
                    <tr>
                      <td colSpan={3} className="empty-state">
                        No application activity recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Website activity</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {websites.map((w) => (
                    <tr key={w._id}>
                      <td title={w.url}>{w.domain}</td>
                      <td>{formatDateTime(w.visitTime)}</td>
                      <td>{w.blocked && <Badge value="blocked" tone="danger" />}</td>
                    </tr>
                  ))}
                  {!websites.length && (
                    <tr>
                      <td colSpan={3} className="empty-state">
                        No website activity recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
