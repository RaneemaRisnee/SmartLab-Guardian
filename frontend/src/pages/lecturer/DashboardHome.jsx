import { Play, Square, FileText } from 'lucide-react';

const LecturerDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome, Lecturer</h3>
        <p className="text-gray-500 text-sm mb-6">Manage your laboratory sessions and monitor student progress.</p>
        
        <div className="flex space-x-4">
          <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <Play size={18} />
            <span>Start Session</span>
          </button>
          
          <button className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <Square size={18} />
            <span>End Session</span>
          </button>
          
          <button className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <FileText size={18} />
            <span>Session Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
