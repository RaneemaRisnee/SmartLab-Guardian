import { useState } from 'react';
import { listAttendance, overrideAttendance } from '../api/attendance';
import { listLabs } from '../api/labs';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';
import { formatDate, formatMinutes } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [lab, setLab] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: 'present', remarks: '' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: labs } = useAsync(listLabs, []);

  const { data, loading, error, reload } = useAsync(
    () => listAttendance({ page, limit: 20, status: status || undefined, lab: lab || undefined }),
    [page, status, lab]
  );

  const canOverride = ['admin', 'lecturer'].includes(user?.role);

  const openEdit = (record) => {
    setEditing(record);
    setForm({ status: record.status, remarks: record.remarks || '' });
  };

  const handleSave = async () => {
    setBusy(true);
    setActionError('');
    try {
      await overrideAttendance(editing._id, form);
      setEditing(null);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Attendance" />
      <div className="page-content">
        <div className="toolbar">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="flagged">Flagged</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div className="field">
            <label>Lab</label>
            <select value={lab} onChange={(e) => { setLab(e.target.value); setPage(1); }}>
              <option value="">All labs</option>
              {labs?.map((l) => (
                <option key={l._id} value={l._id}>{l.code}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm" onClick={reload} style={{ marginLeft: 'auto' }}>Refresh</button>
        </div>

        <AlertBanner>{error}</AlertBanner>

        <div className="card">
          {loading && !data ? (
            <Spinner />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Lab</th>
                      <th>Active / Required</th>
                      <th>Missing apps</th>
                      <th>Status</th>
                      {canOverride && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((r) => (
                      <tr key={r._id}>
                        <td>{formatDate(r.date)}</td>
                        <td>
                          <div>{r.student?.name}</div>
                          <div className="text-sm text-muted">{r.student?.regNo}</div>
                        </td>
                        <td>{r.lab?.code}</td>
                        <td>{formatMinutes(r.activeMinutes)} / {formatMinutes(r.requiredMinutes)}</td>
                        <td className="text-sm">{r.requiredAppsMissing?.join(', ') || '-'}</td>
                        <td><Badge value={r.status} /></td>
                        {canOverride && (
                          <td>
                            <button className="btn btn-sm" onClick={() => openEdit(r)}>Override</button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr>
                        <td colSpan={canOverride ? 7 : 6} className="empty-state">No attendance records found</td>
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

      {editing && (
        <Modal
          title={`Override attendance - ${editing.student?.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>Save</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="present">Present</option>
              <option value="flagged">Flagged</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div className="field">
            <label>Remarks</label>
            <textarea
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Reason for the override"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
