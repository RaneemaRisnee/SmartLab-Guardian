import { Play, Square, FileText, UserPlus } from 'lucide-react';

const ExaminerDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome, Examiner</h3>
        <p className="text-gray-500 text-sm mb-6">Manage examination sessions and computer assignments.</p>
        
        <div className="flex flex-wrap gap-4 mb-8">
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

        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Student Assignments</h4>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlus size={18} />
            <span>Assign Students</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExaminerDashboard;
