import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import AdminDashboard from './pages/admin/DashboardHome';
import AdminComputers from './pages/admin/Computers';
import AdminStudents from './pages/admin/Students';
import AdminUsers from './pages/admin/Users';
import LecturerDashboard from './pages/lecturer/DashboardHome';
import ExaminerDashboard from './pages/examiner/DashboardHome';
import StudentDashboard from './pages/student/DashboardHome';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="computers" element={<AdminComputers />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="users" element={<AdminUsers />} />
            {/* Add more admin routes here */}
          </Route>

          {/* Lecturer Routes */}
          <Route path="/lecturer" element={
            <ProtectedRoute allowedRoles={['LECTURER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<LecturerDashboard />} />
            {/* Add more lecturer routes here */}
          </Route>

          {/* Examiner Routes */}
          <Route path="/examiner" element={
            <ProtectedRoute allowedRoles={['EXAMINER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ExaminerDashboard />} />
            {/* Add more examiner routes here */}
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDashboard />} />
            {/* Add more student routes here */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
