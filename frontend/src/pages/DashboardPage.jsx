import { Link } from 'react-router-dom';
import { getOverview } from '../api/dashboard';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import MiniBarChart from '../components/MiniBarChart';
import { formatDateTime } from '../utils/format';

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(getOverview, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <button className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />
      <div className="page-content">
        <AlertBanner>{error}</AlertBanner>
        {loading && !data ? (
          <Spinner />
        ) : (
          data && (
            <>
              <div className="grid grid-stats" style={{ marginBottom: 20 }}>
                <StatCard
                  label="Active sessions"
                  value={data.stats.activeSessions}
                  sub={`${data.stats.todaySessions} sessions today`}
                />
                <StatCard
                  label="Flagged today"
                  value={data.stats.flaggedToday}
                  sub="Possible misuse"
                  accent={data.stats.flaggedToday > 0 ? 'danger' : undefined}
                />
                <StatCard
                  label="Open hardware alerts"
                  value={data.stats.openAlerts}
                  sub={`${data.stats.criticalAlerts} high severity`}
                  accent={data.stats.openAlerts > 0 ? 'warning' : undefined}
                />
                <StatCard
                  label="Computers online"
                  value={`${data.stats.computersInUse + data.stats.computersAvailable}/${data.stats.totalComputers}`}
                  sub={`${data.stats.computersOffline} offline`}
                />
                <StatCard label="Registered students" value={data.stats.students} />
                <StatCard
                  label="Hardware inventory"
                  value={data.stats.hardwareTotal}
                  sub={`${data.stats.missingHardware} missing`}
                  accent={data.stats.missingHardware > 0 ? 'danger' : undefined}
                />
                <StatCard label="Upcoming exams" value={data.stats.upcomingExams} />
                <StatCard label="Active labs" value={data.stats.labs} />
              </div>

              <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <div className="card">
                  <div className="card-header">
                    <h3>Sessions this week</h3>
                    <span className="text-sm text-muted">Red = flagged share</span>
                  </div>
                  <div className="card-pad">
                    <MiniBarChart data={data.weekly} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3>Today's attendance</h3>
                  </div>
                  <div className="card-pad">
                    {['present', 'flagged', 'absent'].map((status) => (
                      <div className="list-row" key={status}>
                        <Badge value={status} />
                        <strong>{data.attendanceToday[status] || 0}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="card">
                  <div className="card-header">
                    <h3>Live sessions</h3>
                    <Link className="btn btn-sm" to="/sessions">
                      View all
                    </Link>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>PC</th>
                          <th>Lab</th>
                          <th>Since</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.liveSessions.map((s) => (
                          <tr key={s._id}>
                            <td>{s.student?.name}</td>
                            <td>{s.computer?.pcNumber}</td>
                            <td>{s.lab?.code}</td>
                            <td>{formatDateTime(s.loginTime)}</td>
                          </tr>
                        ))}
                        {!data.liveSessions.length && (
                          <tr>
                            <td colSpan={4} className="empty-state">
                              No one is signed in right now
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3>Recent hardware alerts</h3>
                    <Link className="btn btn-sm" to="/alerts">
                      View all
                    </Link>
                  </div>
                  <div className="card-pad">
                    {data.recentAlerts.map((a) => (
                      <div className="list-row" key={a._id}>
                        <span>
                          {a.computer?.pcNumber} - {a.deviceType}
                        </span>
                        <Badge value={a.severity} />
                      </div>
                    ))}
                    {!data.recentAlerts.length && (
                      <div className="empty-state">No open alerts</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </>
  );
}
