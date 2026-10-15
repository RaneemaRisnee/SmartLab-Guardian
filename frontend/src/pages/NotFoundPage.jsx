import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-content">
      <div className="card card-pad" style={{ textAlign: 'center' }}>
        <h2>Page not found</h2>
        <p className="text-muted">The page you were looking for does not exist.</p>
        <Link className="btn btn-primary" to="/">Back to dashboard</Link>
      </div>
    </div>
  );
}
