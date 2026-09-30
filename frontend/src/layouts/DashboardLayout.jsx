import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Monitor, Cpu, LogOut, FileText, CheckSquare, Server } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getNavItems = () => {
    switch (user?.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'System Users', path: '/admin/users', icon: Users },
          { name: 'Students', path: '/admin/students', icon: Users },
          { name: 'Labs', path: '/admin/labs', icon: Server },
          { name: 'Computers', path: '/admin/computers', icon: Monitor },
          { name: 'Hardware', path: '/admin/hardware', icon: Cpu },
        ];
      case 'LECTURER':
        return [
          { name: 'Dashboard', path: '/lecturer', icon: LayoutDashboard },
          { name: 'Students', path: '/lecturer/students', icon: Users },
          { name: 'Monitoring', path: '/lecturer/monitoring', icon: Monitor },
        ];
      case 'EXAMINER':
        return [
          { name: 'Dashboard', path: '/examiner', icon: LayoutDashboard },
          { name: 'Exam Sessions', path: '/examiner/sessions', icon: FileText },
          { name: 'Assignments', path: '/examiner/assignments', icon: CheckSquare },
        ];
      case 'STUDENT':
        return [
          { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
          { name: 'My Computer', path: '/student/computer', icon: Monitor },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            SmartLab Guardian
          </h1>
          <p className="text-sm text-slate-400 mt-1 capitalize">{user?.role.toLowerCase()} Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{user?.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
