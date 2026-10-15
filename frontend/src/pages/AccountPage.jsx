import { useState } from 'react';
import { changePassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import AlertBanner from '../components/AlertBanner';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm(emptyForm);
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My Account" />
      <div className="page-content">
        <div className="form-grid" style={{ alignItems: 'start' }}>
          <section className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Profile</h3>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Name</label>
              <input value={user?.name || ''} readOnly />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Email</label>
              <input value={user?.email || ''} readOnly />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Role</label>
              <div><Badge value={user?.role} tone="info" /></div>
            </div>
            <div className="field">
              <label>Department</label>
              <input value={user?.department || '-'} readOnly />
            </div>
          </section>
          <section className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Change password</h3>
            <p className="text-sm">Use a password with at least 8 characters. You will remain signed in after changing it.</p>
            <AlertBanner>{error}</AlertBanner>
            <AlertBanner type="success">{success}</AlertBanner>
            <form onSubmit={handleSubmit}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Current password</label>
                <input type="password" value={form.currentPassword} onChange={(e) => updateField('currentPassword', e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>New password</label>
                <input type="password" minLength={8} value={form.newPassword} onChange={(e) => updateField('newPassword', e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 18 }}>
                <label>Confirm new password</label>
                <input type="password" minLength={8} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required />
              </div>
              <button className="btn btn-sm btn-primary" type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
