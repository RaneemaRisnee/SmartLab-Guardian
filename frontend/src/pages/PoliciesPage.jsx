import { useEffect, useState } from 'react';
import { listPolicies, upsertPolicy, deletePolicy } from '../api/policies';
import { listLabs } from '../api/labs';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';

const emptyForm = {
  lab: '',
  minActiveMinutes: 30,
  idleThresholdSeconds: 300,
  requiredApps: '',
  blockedApps: '',
  blockedDomains: '',
  hardwareScanIntervalMinutes: 5,
  heartbeatTimeoutMinutes: 10
};

function toForm(policy) {
  if (!policy) return emptyForm;
  return {
    lab: policy.lab?._id || '',
    minActiveMinutes: policy.minActiveMinutes,
    idleThresholdSeconds: policy.idleThresholdSeconds,
    requiredApps: (policy.requiredApps || []).join(', '),
    blockedApps: (policy.blockedApps || []).join(', '),
    blockedDomains: (policy.blockedDomains || []).join(', '),
    hardwareScanIntervalMinutes: policy.hardwareScanIntervalMinutes,
    heartbeatTimeoutMinutes: policy.heartbeatTimeoutMinutes
  };
}

export default function PoliciesPage() {
  const { data: labs } = useAsync(listLabs, []);
  const { data: policies, loading, error, reload } = useAsync(listPolicies, []);

  const [scope, setScope] = useState(''); // '' = global default
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!policies) return;
    const match = scope ? policies.find((p) => p.lab?._id === scope) : policies.find((p) => !p.lab);
    setForm({ ...toForm(match), lab: scope });
  }, [scope, policies]);

  const handleSave = async () => {
    setBusy(true);
    setActionError('');
    setSaved(false);
    try {
      await upsertPolicy({ ...form, lab: form.lab || undefined });
      setSaved(true);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const currentPolicy = scope
    ? policies?.find((p) => p.lab?._id === scope)
    : policies?.find((p) => !p.lab);

  const handleRemoveOverride = async () => {
    if (!currentPolicy || !window.confirm('Remove this lab override? It will fall back to the global default.')) return;
    try {
      await deletePolicy(currentPolicy._id);
      setScope('');
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Monitoring Policy" />
      <div className="page-content">
        <AlertBanner>{error || actionError}</AlertBanner>
        {saved && <AlertBanner type="success">Policy saved.</AlertBanner>}

        {loading && !policies ? (
          <Spinner />
        ) : (
          <div className="card card-pad" style={{ maxWidth: 640 }}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Applies to</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="">Global default (all labs)</option>
                {labs?.map((l) => (
                  <option key={l._id} value={l._id}>{l.code} - {l.name}</option>
                ))}
              </select>
            </div>

            <div className="form-grid" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Minimum active minutes</label>
                <input
                  type="number"
                  min="0"
                  value={form.minActiveMinutes}
                  onChange={(e) => setForm({ ...form, minActiveMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Idle threshold (seconds)</label>
                <input
                  type="number"
                  min="30"
                  value={form.idleThresholdSeconds}
                  onChange={(e) => setForm({ ...form, idleThresholdSeconds: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Hardware scan interval (min)</label>
                <input
                  type="number"
                  min="1"
                  value={form.hardwareScanIntervalMinutes}
                  onChange={(e) => setForm({ ...form, hardwareScanIntervalMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Heartbeat timeout (min)</label>
                <input
                  type="number"
                  min="1"
                  value={form.heartbeatTimeoutMinutes}
                  onChange={(e) => setForm({ ...form, heartbeatTimeoutMinutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Required applications (comma separated)</label>
              <input value={form.requiredApps} onChange={(e) => setForm({ ...form, requiredApps: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Blocked applications (comma separated)</label>
              <input value={form.blockedApps} onChange={(e) => setForm({ ...form, blockedApps: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Blocked website domains (comma separated)</label>
              <input value={form.blockedDomains} onChange={(e) => setForm({ ...form, blockedDomains: e.target.value })} />
            </div>

            <div className="btn-row">
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleSave}>Save policy</button>
              {scope && currentPolicy && (
                <button className="btn btn-sm btn-danger" onClick={handleRemoveOverride}>Remove lab override</button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
