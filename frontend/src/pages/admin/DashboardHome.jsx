import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Monitor, Server, Cpu, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0, available: 0, inUse: 0, offline: 0
  });

  useEffect(() => {
    const fetchComputers = async () => {
      try {
        const { data } = await api.get('/computers');
        const available = data.filter(c => c.status === 'AVAILABLE').length;
        const inUse = data.filter(c => c.status === 'IN_USE').length;
        const offline = data.filter(c => c.status === 'OFFLINE').length;
        setStats({ total: data.length, available, inUse, offline });
      } catch (error) {
        console.error("Failed to load dashboard data");
      }
    };
    fetchComputers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Computers" value={stats.total} icon={<Monitor className="text-blue-500" />} />
        <StatCard title="Available" value={stats.available} icon={<Server className="text-green-500" />} />
        <StatCard title="In Use" value={stats.inUse} icon={<Cpu className="text-orange-500" />} />
        <StatCard title="Offline" value={stats.offline} icon={<AlertTriangle className="text-red-500" />} />
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Actions</h3>
        <p className="text-gray-500 text-sm">Use the sidebar to navigate to specific management pages.</p>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-all hover:shadow-md">
    <div className="p-3 bg-gray-50 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
