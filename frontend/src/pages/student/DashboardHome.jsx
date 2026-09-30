import { useAuth } from '../../context/AuthContext';
import { Monitor } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.full_name}!</h2>
        <p className="text-blue-100">Here is your current laboratory status.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4">
        <div className="p-4 bg-indigo-50 rounded-lg text-indigo-600">
          <Monitor size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">My Computer</h3>
          <p className="text-gray-500 mt-1">You currently have no computer assigned.</p>
          <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors">
            Request Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
