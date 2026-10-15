import { useRef, useState } from 'react';
import { IconPlus, IconFileSpreadsheet } from '@tabler/icons-react';
import { listStudents, createStudent, updateStudent, deleteStudent, importStudents } from '../api/students';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';

const emptyForm = { regNo: '', name: '', email: '', department: 'Physical Science', batch: '', password: '' };

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const { data, loading, error, reload } = useAsync(
    () => listStudents({ page, limit: 20, search: search || undefined }),
    [page, search]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditingId(student._id);
    setForm({ ...student, password: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setBusy(true);
    setActionError('');
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await updateStudent(editingId, payload);
      } else {
        await createStudent(form);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Remove ${student.name}? Students with recorded sessions are deactivated instead.`)) return;
    try {
      await deleteStudent(student._id);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setActionError('');
    try {
      const result = await importStudents(file);
      setImportResult(result);
      reload();
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
        title="Students"
        actions={
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImport} />
            <button className="btn btn-sm" onClick={() => fileRef.current.click()} disabled={busy}>
              <IconFileSpreadsheet size={15} stroke={1.8} /> Import from Excel
            </button>
            <button className="btn btn-sm btn-primary" onClick={openCreate}>
              <IconPlus size={15} stroke={2} /> Add student
            </button>
          </>
        }
      />
      <div className="page-content">
        {importResult && (
          <AlertBanner type="success">
            Import complete: {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped.
            {importResult.errors?.length > 0 && ` First issue: row ${importResult.errors[0].row} - ${importResult.errors[0].message}`}
          </AlertBanner>
        )}

        <div className="toolbar">
          <div className="field search-input">
            <label>Search</label>
            <input
              placeholder="Name, reg no, email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn btn-sm" onClick={reload} style={{ marginLeft: 'auto' }}>Refresh</button>
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
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Batch</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((s) => (
                      <tr key={s._id}>
                        <td>{s.regNo}</td>
                        <td>{s.name}</td>
                        <td className="text-sm">{s.email}</td>
                        <td>{s.batch || '-'}</td>
                        <td><Badge value={s.isActive ? 'active' : 'inactive'} tone={s.isActive ? 'success' : 'default'} /></td>
                        <td className="btn-row">
                          <button className="btn btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    {!data?.items.length && (
                      <tr><td colSpan={6} className="empty-state">No students found</td></tr>
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
          title={editingId ? 'Edit student' : 'Add student'}
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
              <label>Registration number</label>
              <input value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} disabled={!!editingId} />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Batch</label>
              <input value={form.batch || ''} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
            </div>
            <div className="field">
              <label>{editingId ? 'New password (optional)' : 'Password (optional, default used otherwise)'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
