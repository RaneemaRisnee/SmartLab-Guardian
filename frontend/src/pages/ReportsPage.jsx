import { useState } from 'react';
import { usageReport, attendanceReport, hardwareReport, exportRows } from '../api/reports';
import { listLabs } from '../api/labs';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import { formatDateTime, formatMinutes, toDateInput } from '../utils/format';

const TABS = [
  { key: 'usage', label: 'Usage report' },
  { key: 'attendance', label: 'Attendance report' },
  { key: 'hardware', label: 'Hardware report' }
];

export default function ReportsPage() {
  const [tab, setTab] = useState('usage');
  const [lab, setLab] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(toDateInput());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const { data: labs } = useAsync(listLabs, []);

  const params = { lab: lab || undefined, from: from || undefined, to: to || undefined };

  const fetcher = tab === 'usage' ? usageReport : tab === 'attendance' ? attendanceReport : hardwareReport;
  const { data, loading, error } = useAsync(() => fetcher(params), [tab, lab, from, to]);

  const handleExport = async () => {
    if (!data?.rows?.length) return;
    setExporting(true);
    setExportError('');
    try {
      await exportRows(data.rows, `smartlab-${tab}-report`, tab);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" />
      <div className="page-content">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="field">
            <label>Lab</label>
            <select value={lab} onChange={(e) => setLab(e.target.value)}>
              <option value="">All labs</option>
              {labs?.map((l) => <option key={l._id} value={l._id}>{l.code}</option>)}
            </select>
          </div>
          <div className="field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button
            className="btn btn-sm btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={handleExport}
            disabled={exporting || !data?.rows?.length}
          >
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>

        <AlertBanner>{error || exportError}</AlertBanner>

        {loading && !data ? (
          <Spinner />
        ) : (
          data && (
            <>
              {tab === 'usage' && <UsageReport data={data} />}
              {tab === 'attendance' && <AttendanceReport data={data} />}
              {tab === 'hardware' && <HardwareReport data={data} />}
            </>
          )
        )}
      </div>
    </>
  );
}

function UsageReport({ data }) {
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Sessions" value={data.summary.sessions} />
        <StatCard label="Active time" value={formatMinutes(data.summary.activeMinutes)} />
        <StatCard label="Avg active / session" value={formatMinutes(data.summary.averageActiveMinutes)} />
        <StatCard label="Flagged" value={data.summary.flagged} accent={data.summary.flagged ? 'danger' : undefined} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3>Top applications</h3></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Application</th><th>Minutes</th><th>Sessions</th></tr></thead>
              <tbody>
                {data.topApps.map((a) => (
                  <tr key={a.appName}><td>{a.appName}</td><td>{a.minutes}</td><td>{a.sessions}</td></tr>
                ))}
                {!data.topApps.length && <tr><td colSpan={3} className="empty-state">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Sessions ({data.rows.length})</h3></div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Student</th><th>PC</th><th>Active</th><th>Flagged</th></tr></thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.student}</td>
                    <td>{r.pc}</td>
                    <td>{formatMinutes(r.activeMinutes)}</td>
                    <td>{r.flagged ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                {!data.rows.length && <tr><td colSpan={4} className="empty-state">No sessions in this range</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function AttendanceReport({ data }) {
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Records" value={data.summary.total} />
        <StatCard label="Present" value={data.summary.present} accent="success" />
        <StatCard label="Flagged" value={data.summary.flagged} accent={data.summary.flagged ? 'danger' : undefined} />
        <StatCard label="Attendance rate" value={`${data.summary.attendanceRate}%`} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Student</th><th>Lab</th><th>Active/Required</th><th>Status</th></tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{formatDateTime(r.date)}</td>
                  <td>{r.student}</td>
                  <td>{r.lab}</td>
                  <td>{formatMinutes(r.activeMinutes)} / {formatMinutes(r.requiredMinutes)}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={5} className="empty-state">No records in this range</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function HardwareReport({ data }) {
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Devices" value={data.summary.total} />
        <StatCard label="Open alerts" value={data.summary.openAlerts} accent={data.summary.openAlerts ? 'danger' : undefined} />
        <StatCard label="Connected" value={data.summary.byStatus.connected || 0} accent="success" />
        <StatCard label="Missing" value={data.summary.byStatus.missing || 0} accent="danger" />
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3>Inventory ({data.rows.length})</h3></div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Type</th><th>PC</th><th>Status</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.hardwareId}><td>{r.hardwareId}</td><td>{r.deviceType}</td><td>{r.pc}</td><td>{r.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Removal alerts ({data.alertRows.length})</h3></div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Time</th><th>PC</th><th>Device</th><th>Status</th></tr></thead>
              <tbody>
                {data.alertRows.map((r, i) => (
                  <tr key={i}>
                    <td>{formatDateTime(r.removalTime)}</td>
                    <td>{r.pc}</td>
                    <td>{r.device}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
