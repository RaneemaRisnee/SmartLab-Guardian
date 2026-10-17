import { useState } from 'react';
import { usageReport, attendanceReport, hardwareReport, exportRows } from '../api/reports';
import { listLabs } from '../api/labs';
import { listMonitoringSessions } from '../api/monitoringSessions';
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
  const [monitoringSession, setMonitoringSession] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(toDateInput());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { data: labs } = useAsync(listLabs, []);
  const { data: monitoringSessions } = useAsync(listMonitoringSessions, []);
  const params = {
    lab: lab || undefined,
    monitoringSession: monitoringSession || undefined,
    from: from || undefined,
    to: to || undefined
  };
  const fetcher = tab === 'usage' ? usageReport : tab === 'attendance' ? attendanceReport : hardwareReport;
  const { data, loading, error } = useAsync(() => fetcher(params), [tab, lab, monitoringSession, from, to]);
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  const handleExport = async () => {
    if (!rows.length) return;
    setExporting(true);
    setExportError('');
    try {
      await exportRows(rows, `smartlab-${tab}-report`, tab);
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
          {TABS.map((item) => (
            <button
              key={item.key}
              className={`tab-btn${tab === item.key ? ' active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div className="field">
            <label>Lab</label>
            <select value={lab} onChange={(e) => setLab(e.target.value)}>
              <option value="">All labs</option>
              {labs?.map((item) => <option key={item._id} value={item._id}>{item.code}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Monitoring session</label>
            <select value={monitoringSession} onChange={(e) => setMonitoringSession(e.target.value)}>
              <option value="">All sessions</option>
              {monitoringSessions?.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.lab?.code} · {formatDateTime(item.startedAt)} · {item.status}
                </option>
              ))}
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
          <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }} onClick={handleExport} disabled={exporting || !rows.length}>
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>
        <AlertBanner>{error || exportError}</AlertBanner>
        {loading ? <Spinner /> : data ? (
          <>
            {tab === 'usage' && <UsageReport data={data} />}
            {tab === 'attendance' && <AttendanceReport data={data} />}
            {tab === 'hardware' && <HardwareReport data={data} />}
          </>
        ) : (
          <div className="card card-pad empty-state">No report data is available for the selected filters.</div>
        )}
      </div>
    </>
  );
}

function UsageReport({ data }) {
  const summary = data.summary || {};
  const topApps = Array.isArray(data.topApps) ? data.topApps : [];
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Sessions" value={summary.sessions || 0} />
        <StatCard label="Active time" value={formatMinutes(summary.activeMinutes || 0)} />
        <StatCard label="Avg active / session" value={formatMinutes(summary.averageActiveMinutes || 0)} />
        <StatCard label="Flagged" value={summary.flagged || 0} accent={summary.flagged ? 'danger' : undefined} />
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3>Top applications</h3></div>
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Application</th><th>Minutes</th><th>Sessions</th></tr></thead>
            <tbody>
              {topApps.map((item) => <tr key={item.appName}><td>{item.appName}</td><td>{item.minutes}</td><td>{item.sessions}</td></tr>)}
              {!topApps.length && <tr><td colSpan={3} className="empty-state">No application data in this range</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Sessions ({rows.length})</h3></div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}><table className="data-table">
            <thead><tr><th>Student</th><th>PC</th><th>Active</th><th>Flagged</th></tr></thead>
            <tbody>
              {rows.map((item, index) => <tr key={index}><td>{item.student}</td><td>{item.pc}</td><td>{formatMinutes(item.activeMinutes || 0)}</td><td>{item.flagged ? 'Yes' : 'No'}</td></tr>)}
              {!rows.length && <tr><td colSpan={4} className="empty-state">No sessions in this range</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

function AttendanceReport({ data }) {
  const summary = data.summary || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Records" value={summary.total || 0} />
        <StatCard label="Present" value={summary.present || 0} accent="success" />
        <StatCard label="Flagged" value={summary.flagged || 0} accent={summary.flagged ? 'danger' : undefined} />
        <StatCard label="Attendance rate" value={`${summary.attendanceRate || 0}%`} />
      </div>
      <div className="card"><div className="table-wrap"><table className="data-table">
        <thead><tr><th>Date</th><th>Student</th><th>Lab</th><th>Active/Required</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((item, index) => <tr key={index}><td>{formatDateTime(item.date)}</td><td>{item.student}</td><td>{item.lab}</td><td>{formatMinutes(item.activeMinutes || 0)} / {formatMinutes(item.requiredMinutes || 0)}</td><td>{item.status}</td></tr>)}
          {!rows.length && <tr><td colSpan={5} className="empty-state">No attendance records in this range</td></tr>}
        </tbody>
      </table></div></div>
    </>
  );
}

function HardwareReport({ data }) {
  const summary = data.summary || {};
  const byStatus = summary.byStatus || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const alertRows = Array.isArray(data.alertRows) ? data.alertRows : [];
  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Devices" value={summary.total || 0} />
        <StatCard label="Open alerts" value={summary.openAlerts || 0} accent={summary.openAlerts ? 'danger' : undefined} />
        <StatCard label="Connected" value={byStatus.connected || 0} accent="success" />
        <StatCard label="Missing" value={byStatus.missing || 0} accent="danger" />
      </div>
      <div className="grid grid-2">
        <div className="card"><div className="card-header"><h3>Inventory ({rows.length})</h3></div><div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}><table className="data-table">
          <thead><tr><th>ID</th><th>Type</th><th>PC</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((item) => <tr key={item.hardwareId}><td>{item.hardwareId}</td><td>{item.deviceType}</td><td>{item.pc}</td><td>{item.status}</td></tr>)}
            {!rows.length && <tr><td colSpan={4} className="empty-state">No hardware records in this range</td></tr>}
          </tbody>
        </table></div></div>
        <div className="card"><div className="card-header"><h3>Removal alerts ({alertRows.length})</h3></div><div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}><table className="data-table">
          <thead><tr><th>Time</th><th>PC</th><th>Device</th><th>Status</th></tr></thead>
          <tbody>
            {alertRows.map((item, index) => <tr key={index}><td>{formatDateTime(item.removalTime)}</td><td>{item.pc}</td><td>{item.device}</td><td>{item.status}</td></tr>)}
            {!alertRows.length && <tr><td colSpan={4} className="empty-state">No removal alerts in this range</td></tr>}
          </tbody>
        </table></div></div>
      </div>
    </>
  );
}
