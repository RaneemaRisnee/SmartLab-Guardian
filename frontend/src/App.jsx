import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import AttendancePage from './pages/AttendancePage';
import HardwarePage from './pages/HardwarePage';
import AlertsPage from './pages/AlertsPage';
import StudentsPage from './pages/StudentsPage';
import LabsPage from './pages/LabsPage';
import ExamsPage from './pages/ExamsPage';
import ExamDetailPage from './pages/ExamDetailPage';
import ReportsPage from './pages/ReportsPage';
import PoliciesPage from './pages/PoliciesPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route
          path="attendance"
          element={
            <ProtectedRoute roles={['admin', 'lecturer']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hardware"
          element={
            <ProtectedRoute roles={['admin']}>
              <HardwarePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <ProtectedRoute roles={['admin']}>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students"
          element={
            <ProtectedRoute roles={['admin']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="labs"
          element={
            <ProtectedRoute roles={['admin']}>
              <LabsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exams"
          element={
            <ProtectedRoute roles={['admin', 'examiner']}>
              <ExamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="exams/:id"
          element={
            <ProtectedRoute roles={['admin', 'examiner']}>
              <ExamDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="policies"
          element={
            <ProtectedRoute roles={['admin', 'lecturer']}>
              <PoliciesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
