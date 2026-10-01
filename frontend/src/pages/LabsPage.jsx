import { useRef, useState } from 'react';
import { IconPlus, IconFileSpreadsheet } from '@tabler/icons-react';
import { listLabs, createLab, updateLab, deleteLab } from '../api/labs';
import { listComputers, createComputer, updateComputer, deleteComputer, importComputers } from '../api/computers';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/format';

const emptyLabForm = { code: '', name: '', location: '', capacity: 0 };
const emptyPcForm = { pcNumber: '', hostname: '', ipAddress: '', status: 'available' };
const PC_STATUSES = ['available', 'in-use', 'offline', 'maintenance'];

export default function LabsPage() {
  const { data: labs, loading: labsLoading, error: labsError, reload: reloadLabs } = useAsync(listLabs, []);
  const [selectedLabId, setSelectedLabId] = useState(null);
  const selectedLab = labs?.find((l) => l._id === selectedLabId) || labs?.[0];

  const [labModalOpen, setLabModalOpen] = useState(false);
  const [editingLabId, setEditingLabId] = useState(null);
  const [labForm, setLabForm] = useState(emptyLabForm);

  const [pcModalOpen, setPcModalOpen] = useState(false);
  const [editingPcId, setEditingPcId] = useState(null);
  const [pcForm, setPcForm] = useState(emptyPcForm);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const activeLabId = selectedLab?._id;
  const {
    data: computers,
    loading: computersLoading,
    reload: reloadComputers
  } = useAsync(() => (activeLabId ? listComputers({ lab: activeLabId, limit: 100 }) : Promise.resolve(null)), [activeLabId]);

  const openCreateLab = () => {
    setEditingLabId(null);
    setLabForm(emptyLabForm);
    setLabModalOpen(true);
  };

  const openEditLab = (lab) => {
    setEditingLabId(lab._id);
    setLabForm({ code: lab.code, name: lab.name, location: lab.location || '', capacity: lab.capacity || 0 });
    setLabModalOpen(true);
  };

  const saveLab = async () => {
    setBusy(true);
    setActionError('');
    try {
      if (editingLabId) await updateLab(editingLabId, labForm);
      else await createLab(labForm);
      setLabModalOpen(false);
      reloadLabs();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeLab = async (lab) => {
    if (!window.confirm(`Delete lab ${lab.code}? This is blocked while it still has computers.`)) return;
    try {
      await deleteLab(lab._id);
      reloadLabs();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openCreatePc = () => {
    setEditingPcId(null);
    setPcForm(emptyPcForm);
    setPcModalOpen(true);
  };

  const openEditPc = (pc) => {
    setEditingPcId(pc._id);
    setPcForm({ pcNumber: pc.pcNumber, hostname: pc.hostname || '', ipAddress: pc.ipAddress || '', status: pc.status });
    setPcModalOpen(true);
  };

  const savePc = async () => {
    setBusy(true);
    setActionError('');
    try {
      if (editingPcId) await updateComputer(editingPcId, pcForm);
      else await createComputer({ ...pcForm, lab: selectedLab._id });
      setPcModalOpen(false);
      reloadComputers();
      reloadLabs();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removePc = async (pc) => {
    if (!window.confirm(`Delete computer ${pc.pcNumber}?`)) return;
    try {
      await deleteComputer(pc._id);
      reloadComputers();
      reloadLabs();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedLab) return;
    setBusy(true);
    setActionError('');
    try {
      const result = await importComputers(file, selectedLab._id);
      setImportResult(result);
      reloadComputers();
      reloadLabs();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      fileRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Labs & Computers"
        actions={
          <button className="btn btn-sm btn-primary" onClick={openCreateLab}>
            <IconPlus size={15} stroke={2} /> Add lab
          </button>
        }
      />
      <div className="page-content">
        <AlertBanner>{labsError || actionError}</AlertBanner>

        {labsLoading && !labs ? (
          <Spinner />
        ) : (
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header"><h3>Labs</h3></div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Computers</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {labs?.map((lab) => (
                      <tr
                        key={lab._id}
                        onClick={() => setSelectedLabId(lab._id)}
                        style={{ cursor: 'pointer', background: selectedLab?._id === lab._id ? '#f2f6ff' : undefined }}
                      >
                        <td>{lab.code}</td>
                        <td>{lab.name}</td>
                        <td>
                          {lab.computerCounts.total} total &middot;{' '}
                          <span className="text-sm text-muted">
                            {lab.computerCounts.available} avail / {lab.computerCounts['in-use']} in-use
                          </span>
                        </td>
                        <td className="btn-row" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-sm" onClick={() => openEditLab(lab)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => removeLab(lab)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {!labs?.length && <tr><td colSpan={4} className="empty-state">No labs registered yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>{selectedLab ? `${selectedLab.code} computers` : 'Select a lab'}</h3>
                {selectedLab && (
                  <div className="btn-row">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImport} />
                    <button className="btn btn-sm" onClick={() => fileRef.current.click()} disabled={busy}>
                      <IconFileSpreadsheet size={15} stroke={1.8} /> Import
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={openCreatePc}>
                      <IconPlus size={15} stroke={2} /> Add PC
                    </button>
                  </div>
                )}
              </div>
              {importResult && (
                <div className="card-pad">
                  <AlertBanner type="success">
                    {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped.
                  </AlertBanner>
                </div>
              )}
              {!selectedLab ? (
                <div className="empty-state">Choose a lab on the left to manage its computers</div>
              ) : computersLoading ? (
                <Spinner />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PC</th>
                        <th>Status</th>
                        <th>Current student</th>
                        <th>Last heartbeat</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {computers?.items.map((pc) => (
                        <tr key={pc._id}>
                          <td>{pc.pcNumber}</td>
                          <td><Badge value={pc.status} /></td>
                          <td>{pc.currentStudent?.regNo || '-'}</td>
                          <td className="text-sm">{pc.lastHeartbeatAt ? formatDateTime(pc.lastHeartbeatAt) : 'never'}</td>
                          <td className="btn-row">
                            <button className="btn btn-sm" onClick={() => openEditPc(pc)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => removePc(pc)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                      {!computers?.items.length && (
                        <tr><td colSpan={5} className="empty-state">No computers registered in this lab</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {labModalOpen && (
        <Modal
          title={editingLabId ? 'Edit lab' : 'Add lab'}
          onClose={() => setLabModalOpen(false)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setLabModalOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={saveLab}>Save</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="form-grid">
            <div className="field">
              <label>Code</label>
              <input value={labForm.code} onChange={(e) => setLabForm({ ...labForm, code: e.target.value })} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={labForm.name} onChange={(e) => setLabForm({ ...labForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={labForm.location} onChange={(e) => setLabForm({ ...labForm, location: e.target.value })} />
            </div>
            <div className="field">
              <label>Capacity</label>
              <input type="number" min="0" value={labForm.capacity} onChange={(e) => setLabForm({ ...labForm, capacity: Number(e.target.value) })} />
            </div>
          </div>
        </Modal>
      )}

      {pcModalOpen && (
        <Modal
          title={editingPcId ? 'Edit computer' : 'Add computer'}
          onClose={() => setPcModalOpen(false)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setPcModalOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={savePc}>Save</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="form-grid">
            <div className="field">
              <label>PC number</label>
              <input value={pcForm.pcNumber} onChange={(e) => setPcForm({ ...pcForm, pcNumber: e.target.value })} disabled={!!editingPcId} />
            </div>
            <div className="field">
              <label>Hostname</label>
              <input value={pcForm.hostname} onChange={(e) => setPcForm({ ...pcForm, hostname: e.target.value })} />
            </div>
            <div className="field">
              <label>IP address</label>
              <input value={pcForm.ipAddress} onChange={(e) => setPcForm({ ...pcForm, ipAddress: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={pcForm.status} onChange={(e) => setPcForm({ ...pcForm, status: e.target.value })}>
                {PC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
