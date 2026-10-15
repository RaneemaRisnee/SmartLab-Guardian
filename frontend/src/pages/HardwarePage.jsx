import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import {
  listHardware,
  hardwareSummary,
  createHardware,
  updateHardware,
  deleteHardware
} from '../api/hardware';
import { listLabs } from '../api/labs';
import { listComputers } from '../api/computers';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { formatDateTime } from '../utils/format';

const DEVICE_TYPES = ['keyboard', 'mouse', 'monitor', 'system-unit', 'storage', 'headset', 'webcam', 'ups', 'other'];
const CONDITIONS = ['new', 'good', 'fair', 'damaged'];
const STATUSES = ['connected', 'disconnected', 'missing', 'in-store', 'retired'];

const emptyForm = {
  hardwareId: '',
  deviceType: 'keyboard',
  vendor: '',
  model: '',
  serialNumber: '',
  condition: 'good',
  status: 'in-store',
  computer: ''
};

export default function HardwarePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: summary, reload: reloadSummary } = useAsync(hardwareSummary, []);
  const { data: computers } = useAsync(() => listComputers({ limit: 200 }), []);

  const { data, loading, error, reload } = useAsync(
    () => listHardware({ page, limit: 20, search: search || undefined, deviceType: deviceType || undefined, status: status || undefined }),
    [page, search, deviceType, status]
  );

  const refreshAll = () => {
    reload();
    reloadSummary();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (device) => {
    setEditingId(device._id);
    setForm({
      hardwareId: device.hardwareId,
      deviceType: device.deviceType,
      vendor: device.vendor || '',
      model: device.model || '',
      serialNumber: device.serialNumber || '',
      condition: device.condition,
      status: device.status,
      computer: device.computer?._id || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setBusy(true);
    setActionError('');
    try {
      const payload = { ...form, computer: form.computer || null };
      if (editingId) await updateHardware(editingId, payload);
      else await createHardware(payload);
      setModalOpen(false);
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hardware record and its alert history?')) return;
    try {
      await deleteHardware(id);
      refreshAll();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Hardware Inventory"
        actions={
          <button className="btn btn-sm btn-primary" onClick={openCreate}>
            <IconPlus size={15} stroke={2} /> Register device
          </button>
        }
      />
      <div className="page-content">
        {summary && (
          <div className="grid grid-stats" style={{ marginBottom: 20 }}>
            <StatCard label="Total devices" value={summary.total} />
            <StatCard label="Connected" value={summary.byStatus.connected || 0} accent="success" />
            <StatCard label="Disconnected" value={summary.byStatus.disconnected || 0} accent="danger" />
            <StatCard label="Missing" value={summary.byStatus.missing || 0} accent="danger" />
            <StatCard label="In store" value={summary.byStatus['in-store'] || 0} />
            <StatCard label="Open alerts" value={summary.openAlerts} accent={summary.openAlerts ? 'warning' : undefined} />
          </div>
        )}

        <div className="toolbar">
          <div className="field search-input">
            <label>Search</label>
            <input
              placeholder="Hardware ID, serial, model…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="field">
            <label>Device type</label>
            <select value={deviceType} onChange={(e) => { setDeviceType(e.target.value); setPage(1); }}>
              <option value="">All types</option>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                      <th>Hardware ID</th>
                      <th>Type</th>
                      <th>Model</th>
                      <th>PC</th>
                      <th>Condition</th>
                      <th>Status</th>
                      <th>Last seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((d) => (
                      <tr key={d._id}>
                        <td>{d.hardwareId}</td>
                        <td>{d.deviceType}</td>
                        <td>{[d.vendor, d.model].filter(Boolean).join(' ') || '-'}</td>
                        <td>{d.computer?.pcNumber || '-'}</td>
                        <td><Badge value={d.condition} tone={d.condition === 'damaged' ? 'danger' : 'default'} /></td>
                        <td><Badge value={d.status} /></td>
                        <td className="text-sm">{d.lastSeenAt ? formatDateTime(d.lastSeenAt) : '-'}</td>
                        <td className="btn-row">
                          <button className="btn btn-sm" onClick={() => openEdit(d)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr><td colSpan={8} className="empty-state">No hardware records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={data?.pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? 'Edit hardware device' : 'Register hardware device'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>Save</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="form-grid">
            <div className="field">
              <label>Hardware ID</label>
              <input value={form.hardwareId} onChange={(e) => setForm({ ...form, hardwareId: e.target.value })} disabled={!!editingId} />
            </div>
            <div className="field">
              <label>Device type</label>
              <select value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value })}>
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Vendor</label>
              <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div className="field">
              <label>Model</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="field">
              <label>Serial number</label>
              <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            </div>
            <div className="field">
              <label>Condition</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Assigned PC</label>
              <select value={form.computer} onChange={(e) => setForm({ ...form, computer: e.target.value })}>
                <option value="">Unassigned (store)</option>
                {computers?.items.map((c) => <option key={c._id} value={c._id}>{c.pcNumber}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
