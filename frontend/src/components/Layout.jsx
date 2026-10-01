import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconDeviceDesktopAnalytics,
  IconClipboardCheck,
  IconSchool,
  IconCpu,
  IconAlertTriangle,
  IconUsers,
  IconBuilding,
  IconReportAnalytics,
  IconSettings,
  IconShieldCheck,
  IconLogout
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconLayoutDashboard, roles: ['admin', 'lecturer', 'examiner'] },
  { to: '/sessions', label: 'Live & Sessions', icon: IconDeviceDesktopAnalytics, roles: ['admin', 'lecturer', 'examiner'] },
  { to: '/attendance', label: 'Attendance', icon: IconClipboardCheck, roles: ['admin', 'lecturer'] },
  { to: '/exams', label: 'Exam Sign-In', icon: IconSchool, roles: ['admin', 'examiner'] },
  { to: '/hardware', label: 'Hardware', icon: IconCpu, roles: ['admin'] },
  { to: '/alerts', label: 'Removal Alerts', icon: IconAlertTriangle, roles: ['admin'] },
  { to: '/students', label: 'Students', icon: IconUsers, roles: ['admin'] },
  { to: '/labs', label: 'Labs & Computers', icon: IconBuilding, roles: ['admin'] },
  { to: '/reports', label: 'Reports', icon: IconReportAnalytics, roles: ['admin', 'lecturer', 'examiner'] },
  { to: '/policies', label: 'Monitoring Policy', icon: IconSettings, roles: ['admin', 'lecturer'] }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = NAV.filter((item) => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <IconShieldCheck size={18} stroke={2} />
          </div>
          <div className="sidebar-brand-text">
            <strong>SmartLab Guardian</strong>
            <span>Lab management &amp; monitoring</span>
          </div>
        </div>

        <nav>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-icon">
                  <Icon size={17} stroke={1.8} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            {user?.role}
          </div>
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            <IconLogout size={15} stroke={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <Outlet />
      </div>
    </div>
  );
}
