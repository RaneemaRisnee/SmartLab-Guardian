import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they try to access wrong role page
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'LECTURER') return <Navigate to="/lecturer" replace />;
    if (user.role === 'EXAMINER') return <Navigate to="/examiner" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
