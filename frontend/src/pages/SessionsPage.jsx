import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, endSession } from '../api/sessions';
import { listLabs } from '../api/labs';
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

  const { data: labs } = useAsync(listLabs, []);

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
      <PageHeader title="Live &amp; Session History" />
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
