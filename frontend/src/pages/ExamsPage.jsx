import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { listExams, createExam } from '../api/exams';
import { listLabs } from '../api/labs';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import Modal from '../components/Modal';
import { formatDate, toDateInput } from '../utils/format';

const emptyForm = { code: '', name: '', lab: '', examDate: toDateInput(), startTime: '09:00', endTime: '11:00' };

export default function ExamsPage() {
  const navigate = useNavigate();
  const { data: labs } = useAsync(listLabs, []);
  const { data: exams, loading, error, reload } = useAsync(listExams, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const openCreate = () => {
    setForm({ ...emptyForm, lab: labs?.[0]?._id || '' });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    setBusy(true);
    setActionError('');
    try {
      const exam = await createExam(form);
      setModalOpen(false);
      navigate(`/exams/${exam._id}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Exam Sign-In"
        actions={
          <button className="btn btn-sm btn-primary" onClick={openCreate}>
            <IconPlus size={15} stroke={2} /> New exam
          </button>
        }
      />
      <div className="page-content">
        <AlertBanner>{error}</AlertBanner>

        {loading && !exams ? (
          <Spinner />
        ) : (
          <div className="grid grid-stats">
            {exams?.map((exam) => (
              <div
                key={exam._id}
                className="card card-pad"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/exams/${exam._id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{exam.code}</strong>
                    <div className="text-sm text-muted">{exam.name}</div>
                  </div>
                  <Badge value={exam.status} />
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 10 }}>
                  {exam.lab?.code} &middot; {formatDate(exam.examDate)} &middot; {exam.startTime}-{exam.endTime}
                </div>
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <strong>{exam.assignmentCounts['signed-in']}</strong>/{exam.assignmentCounts.total} signed in
                </div>
              </div>
            ))}
            {!exams?.length && <div className="empty-state">No exam sessions created yet</div>}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="New exam session"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleCreate}>Create</button>
            </>
          }
        >
          <AlertBanner>{actionError}</AlertBanner>
          <div className="form-grid">
            <div className="field">
              <label>Exam code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="IT3162-PRAC-01" />
            </div>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Lab</label>
              <select value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })}>
                {labs?.map((l) => <option key={l._id} value={l._id}>{l.code} - {l.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="field">
              <label>End time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
