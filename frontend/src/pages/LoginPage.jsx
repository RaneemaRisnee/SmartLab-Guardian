import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import AlertBanner from '../components/AlertBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="sidebar-brand-mark" style={{ color: '#fff' }}>
            <IconShieldCheck size={20} stroke={2} />
          </div>
          <div>
            <h1>SmartLab Guardian</h1>
          </div>
        </div>
        <p className="subtitle">Sign in to the laboratory management dashboard</p>

        <AlertBanner type="error">{error}</AlertBanner>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vau.ac.lk"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-hint">
          Demo accounts (from <code>npm run seed</code>): admin@vau.ac.lk, lecturer@vau.ac.lk,
          examiner@vau.ac.lk. This screen is for lab staff only - students sign in at the lab PC
          itself.
        </div>
      </div>
    </div>
  );
}
