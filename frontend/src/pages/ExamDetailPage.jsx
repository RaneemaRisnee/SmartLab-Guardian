import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getExam,
  importCandidates,
  reassignSeats,
  signInAllCandidates,
  endExam,
  deleteExam
} from '../api/exams';
import { useAsync } from '../hooks/useAsync';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import AlertBanner from '../components/AlertBanner';
import { formatDate, formatDateTime } from '../utils/format';

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => getExam(id), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [signInResult, setSignInResult] = useState(null);
  const fileRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setActionError('');
    try {
      await importCandidates(id, file);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      fileRef.current.value = '';
    }
  };

  const handleReassignSeats = async () => {
    setBusy(true);
    setActionError('');
    try {
      await reassignSeats(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleActivateAndSignIn = async () => {
    setBusy(true);
    setActionError('');
    setSignInResult(null);
    try {
      const result = await signInAllCandidates(id);
      setSignInResult(result);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEndExam = async () => {
    if (!window.confirm('End this exam and sign out everyone still logged in?')) return;
    setBusy(true);
    setActionError('');
    try {
      await endExam(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this exam and its seating plan?')) return;
    try {
      await deleteExam(id);
      navigate('/exams');
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <AlertBanner>{error}</AlertBanner>;

  const { exam, assignments } = data;
  const canSignIn = exam.status !== 'completed' && assignments.some((a) => a.signInStatus === 'pending');

  return (
    <>
      <PageHeader
        title={`${exam.code} - ${exam.name}`}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => navigate('/exams')}>Back</button>
            {exam.status === 'draft' && (
              <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete exam</button>
            )}
          </>
        }
      />
      <div className="page-content">
        <AlertBanner>{error || actionError}</AlertBanner>

        {signInResult && (
          <AlertBanner type={signInResult.failedCount ? 'info' : 'success'}>
            Signed in {signInResult.signedIn} candidate(s).
            {signInResult.failedCount > 0 &&
              ` ${signInResult.failedCount} failed: ${signInResult.failed.map((f) => `${f.regNo} (${f.reason})`).join('; ')}`}
          </AlertBanner>
        )}

        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div className="kv-grid" style={{ marginBottom: 16 }}>
            <div>
              <dt>Lab</dt>
              <dd>{exam.lab?.code} - {exam.lab?.name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(exam.examDate)}, {exam.startTime}-{exam.endTime}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd><Badge value={exam.status} /></dd>
            </div>
            <div>
              <dt>Candidates seated</dt>
              <dd>{assignments.length}</dd>
            </div>
          </div>

          <div className="btn-row">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImport} />
            <button className="btn btn-sm" onClick={() => fileRef.current.click()} disabled={busy}>
              Import candidates (Excel)
            </button>
            <button className="btn btn-sm" onClick={handleReassignSeats} disabled={busy || !assignments.length}>
              Re-run seating
            </button>
            {canSignIn && (
              <button className="btn btn-sm btn-primary" onClick={handleActivateAndSignIn} disabled={busy || !assignments.length}>
                {exam.status === 'active' ? 'Sign in remaining candidates' : 'Start exam & sign in all'}
              </button>
            )}
            {exam.status === 'active' && (
              <button className="btn btn-sm btn-danger" onClick={handleEndExam} disabled={busy}>
                End exam
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Seating plan</h3></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>PC</th>
                  <th>Student</th>
                  <th>Sign-in status</th>
                  <th>Signed in at</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a._id}>
                    <td>{a.seatNumber}</td>
                    <td>{a.computer?.pcNumber}</td>
                    <td>
                      <div>{a.student?.name}</div>
                      <div className="text-sm text-muted">{a.student?.regNo}</div>
                    </td>
                    <td><Badge value={a.signInStatus} /></td>
                    <td className="text-sm">{a.signedInAt ? formatDateTime(a.signedInAt) : '-'}</td>
                  </tr>
                ))}
                {!assignments.length && (
                  <tr><td colSpan={5} className="empty-state">Import a candidate list to build the seating plan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
