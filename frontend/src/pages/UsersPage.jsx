import { useState } from 'react';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { createUser, listUsers, updateUser } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'lecturer',
  department: 'Physical Science',
  isActive: true
};

function formatDate(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, loading, error, reload } = useAsync(listUsers, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActionError('');
    setSuccessMessage('');
    setModalOpen(true);
  };

  const openEdit = (staffUser) => {
    setEditingId(staffUser._id);
    setForm({
      name: staffUser.name || '',
      email: staffUser.email || '',
      password: '',
      role: staffUser.role || 'lecturer',
      department: staffUser.department || '',
      isActive: staffUser.isActive !== false
    });
    setActionError('');
    setSuccessMessage('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setBusy(true);
    setActionError('');
    setSuccessMessage('');
    try {
      if (editingId) {
        await updateUser(editingId, {
          name: form.name,
          role: form.role,
          department: form.department,
          isActive: form.isActive
        });
        setSuccessMessage('Staff account updated.');
      } else {
        if (form.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          department: form.department
        });
        setSuccessMessage('Staff account created.');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (staffUser) => {
    if (staffUser._id === currentUser?._id) {
      setActionError('You cannot deactivate your own account.');
      return;
    }
    const nextState = !staffUser.isActive;
    const action = nextState ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${staffUser.name}?`)) return;
    setBusy(true);
    setActionError('');
    setSuccessMessage('');
    try {
      await updateUser(staffUser._id, { isActive: nextState });
      setSuccessMessage(`Account ${nextState ? 'activated' : 'deactivated'}.`);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Staff Users"
        actions={
          <>
            <button className="btn btn-sm" onClick={reload} disabled={busy}>
              <IconRefresh size={15} stroke={1.8} /> Refresh
            </button>
            <button className="btn btn-sm btn-primary" onClick={openCreate} disabled={busy}>
              <IconPlus size={15} stroke={2} /> Add staff user
            </button>
          </>
        }
      />
      <div className="page-content">
        <AlertBanner>{error || actionError}</AlertBanner>
        <AlertBanner type="success">{successMessage}</AlertBanner>
        <div className="card">
          {loading && !users ? (
            <Spinner />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Last login</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((staffUser) => (
                    <tr key={staffUser._id}>
                      <td>{staffUser.name}</td>
                      <td className="text-sm">{staffUser.email}</td>
                      <td><Badge value={staffUser.role} tone="info" /></td>
                      <td>{staffUser.department || '-'}</td>
                      <td className="text-sm">{formatDate(staffUser.lastLoginAt)}</td>
                      <td>
                        <Badge
                          value={staffUser.isActive ? 'active' : 'inactive'}
                          tone={staffUser.isActive ? 'success' : 'default'}
                        />
                      </td>
                      <td className="btn-row">
                        <button className="btn btn-sm" onClick={() => openEdit(staffUser)} disabled={busy}>Edit</button>
                        <button
                          className={`btn btn-sm${staffUser.isActive ? ' btn-danger' : ''}`}
                          onClick={() => toggleActive(staffUser)}
                          disabled={busy || staffUser._id === currentUser?._id}
                        >
                          {staffUser.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!users?.length && (
                    <tr><td colSpan={7} className="empty-state">No staff users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <strong>Staff account permissions</strong>
          <p className="text-sm" style={{ marginBottom: 0 }}>
            Admins can manage staff accounts. Lecturers manage monitoring and attendance, while examiners manage exam sessions. Deactivated accounts cannot sign in.
          </p>
        </div>
      </div>
      {modalOpen && (
        <Modal
          title={editingId ? 'Edit staff user' : 'Add staff user'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} disabled={!!editingId} required />
            </div>
            {!editingId && (
              <div className="field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} minLength={8} required />
              </div>
            )}
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="lecturer">Lecturer</option>
                <option value="examiner">Examiner</option>
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <input value={form.department} onChange={(e) => updateField('department', e.target.value)} />
            </div>
            {editingId && (
              <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} />
                Account is active
              </label>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
