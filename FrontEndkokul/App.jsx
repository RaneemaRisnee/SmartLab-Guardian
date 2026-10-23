import { useCallback, useEffect, useMemo, useState } from 'react';
import { createHardware, deleteHardware, getHardware, updateHardware } from './services/hardwareService';

const EMPTY_FORM = {
  hardware_id: '', hardware_name: '', category: 'Computer', brand: '', model: '',
  processor: '', ram: '', storage: '', status: 'Working', location: '', notes: ''
};
const CATEGORIES = ['Computer', 'Monitor', 'Keyboard', 'Mouse', 'Printer', 'Projector', 'Network Device', 'Other'];
const STATUSES = ['Working', 'Repair', 'Damaged', 'Unavailable'];

function HardwareForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [formError, setFormError] = useState('');
  useEffect(() => setForm(initial || EMPTY_FORM), [initial]);

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.hardware_id.trim() || !form.hardware_name.trim()) {
      setFormError('Hardware ID and hardware name are required.');
      return;
    }
    try { await onSave(form); }
    catch (err) { setFormError(err.message); }
  };

  return <form className="hardware-form" onSubmit={submit}>
    {formError && <div className="alert error">{formError}</div>}
    <div className="form-grid">
      <label>Hardware ID *<input name="hardware_id" value={form.hardware_id} onChange={change} placeholder="e.g. PC001" required maxLength="40" /></label>
      <label>Hardware name *<input name="hardware_name" value={form.hardware_name} onChange={change} placeholder="e.g. Lab Computer 01" required maxLength="120" /></label>
      <label>Category *<select name="category" value={form.category} onChange={change}>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Status<select name="status" value={form.status} onChange={change}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Brand<input name="brand" value={form.brand} onChange={change} placeholder="e.g. Dell" /></label>
      <label>Model<input name="model" value={form.model} onChange={change} placeholder="e.g. OptiPlex" /></label>
      <label>Processor<input name="processor" value={form.processor} onChange={change} placeholder="e.g. Intel Core i5" /></label>
      <label>RAM<input name="ram" value={form.ram} onChange={change} placeholder="e.g. 8GB" /></label>
      <label>Storage<input name="storage" value={form.storage} onChange={change} placeholder="e.g. 512GB SSD" /></label>
      <label>Location<input name="location" value={form.location} onChange={change} placeholder="e.g. Computer Lab 01" /></label>
      <label className="full">Notes<textarea name="notes" value={form.notes} onChange={change} rows="3" placeholder="Additional information (optional)" /></label>
    </div>
    <div className="form-actions">
      <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
      <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save hardware'}</button>
    </div>
  </form>;
}

function StatusBadge({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);

  const loadHardware = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHardware({ search, status: statusFilter, category: categoryFilter });
      setItems(data);
    } catch (err) {
      setError(`${err.message}. Check that the backend is running and MongoDB is connected.`);
    } finally { setLoading(false); }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { loadHardware(); }, [loadHardware]);

  const stats = useMemo(() => ({
    total: items.length,
    working: items.filter(x => x.status === 'Working').length,
    attention: items.filter(x => ['Repair', 'Damaged', 'Unavailable'].includes(x.status)).length
  }), [items]);

  const save = async (form) => {
    setSaving(true);
    try {
      if (modal?.item) {
        await updateHardware(modal.item._id, form);
        setNotice('Hardware updated successfully.');
      } else {
        await createHardware(form);
        setNotice('Hardware added successfully.');
      }
      setModal(null);
      await loadHardware();
    } finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.hardware_name} (${item.hardware_id})? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try {
      await deleteHardware(item._id);
      setNotice('Hardware deleted successfully.');
      await loadHardware();
    } catch (err) { setError(err.message); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">SG</div>
      <div className="brand-name">SmartLab<span>Guardian</span></div>
      <div className="side-label">MANAGEMENT</div>
      <div className="nav-item active"><span>▦</span> Hardware Inventory</div>
      <div className="sidebar-bottom"><span className="online-dot" /> Inventory module</div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div><div className="eyebrow">SMART LAB MANAGEMENT</div><h1>Hardware Inventory</h1><p className="subtitle">Manage lab equipment, computer specifications and availability.</p></div>
        <button className="button primary add-top" onClick={() => { setNotice(''); setModal({ item: null }); }}>＋ Add hardware</button>
      </header>

      {notice && <div className="alert success"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
      {error && <div className="alert error"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

      <section className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue">▦</div><div><span>Total listed</span><strong>{stats.total}</strong></div></div>
        <div className="stat-card"><div className="stat-icon green">✓</div><div><span>Working</span><strong>{stats.working}</strong></div></div>
        <div className="stat-card"><div className="stat-icon orange">!</div><div><span>Needs attention</span><strong>{stats.attention}</strong></div></div>
      </section>

      <section className="inventory-panel">
        <div className="panel-heading"><div><h2>Equipment register</h2><p>View and maintain registered hardware assets.</p></div><button className="button secondary" onClick={loadHardware}>↻ Refresh</button></div>
        <div className="filters">
          <div className="search-box"><span>⌕</span><input aria-label="Search hardware" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, name, brand or location…" /></div>
          <select aria-label="Filter by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
          <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
        </div>

        <div className="table-wrap"><table>
          <thead><tr><th>Hardware</th><th>Category</th><th>Specifications</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="6" className="empty-state">Loading hardware inventory…</td></tr>
              : items.length === 0 ? <tr><td colSpan="6" className="empty-state"><div className="empty-icon">▦</div><strong>No hardware found</strong><span>Add an asset or change your search filters.</span></td></tr>
              : items.map(item => <tr key={item._id}>
                <td><div className="asset-cell"><div className="asset-icon">{item.category === 'Computer' ? '▣' : '▤'}</div><div><strong>{item.hardware_name}</strong><span>{item.hardware_id}</span><small>{[item.brand, item.model].filter(Boolean).join(' ') || 'No model details'}</small></div></div></td>
                <td>{item.category}</td>
                <td><div className="specs">{item.processor && <span>{item.processor}</span>}{item.ram && <span>RAM {item.ram}</span>}{item.storage && <span>{item.storage}</span>}{!item.processor && !item.ram && !item.storage && <span className="muted">Not specified</span>}</div></td>
                <td>{item.location || <span className="muted">—</span>}</td>
                <td><StatusBadge status={item.status} /></td>
                <td><div className="actions"><button title="View details" onClick={() => setModal({ item, view: true })}>View</button><button title="Edit hardware" onClick={() => { setNotice(''); setModal({ item }); }}>Edit</button><button className="delete-action" title="Delete hardware" onClick={() => remove(item)}>Delete</button></div></td>
              </tr>)}
          </tbody>
        </table></div>
        <div className="table-footer"><span>{loading ? 'Loading…' : `${items.length} asset${items.length === 1 ? '' : 's'} shown`}</span><span>SmartLab Guardian · Hardware Inventory</span></div>
      </section>
      <footer>Hardware Inventory Module <span>•</span> Developed by Kokulan</footer>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setModal(null); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header"><div><div className="eyebrow">{modal.view ? 'ASSET DETAILS' : modal.item ? 'UPDATE REGISTER' : 'NEW REGISTER'}</div><h2 id="modal-title">{modal.view ? modal.item.hardware_name : modal.item ? 'Edit hardware' : 'Add hardware'}</h2></div><button className="close-button" onClick={() => setModal(null)} disabled={saving}>×</button></div>
        {modal.view ? <div className="details-grid">
          {Object.entries({ 'Hardware ID': modal.item.hardware_id, 'Name': modal.item.hardware_name, 'Category': modal.item.category, 'Status': modal.item.status, 'Brand': modal.item.brand, 'Model': modal.item.model, 'Processor': modal.item.processor, 'RAM': modal.item.ram, 'Storage': modal.item.storage, 'Location': modal.item.location, 'Notes': modal.item.notes }).map(([label, value]) => <div className="detail-item" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}
          <button className="button primary full" onClick={() => setModal({ item: modal.item })}>Edit asset</button>
        </div> : <HardwareForm initial={modal.item || EMPTY_FORM} onSave={save} onCancel={() => setModal(null)} saving={saving} />}
      </section>
    </div>}
  </div>;
}
