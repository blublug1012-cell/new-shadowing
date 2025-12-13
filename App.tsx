import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson } from './types';
import { GraduationCap, Book } from 'lucide-react';

const AppContent: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  const [currentStudentId, setCurrentStudentId] = useState<string>('');
  const [studentInputId, setStudentInputId] = useState('');

  // Handle Hash Routing for Student Direct Links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/student/')) {
        const id = hash.split('/student/')[1];
        if (id) {
          setCurrentStudentId(id);
          setMode(AppMode.STUDENT_PORTAL);
        }
      } else if (hash === '#/teacher') {
        setMode(AppMode.TEACHER_DASHBOARD);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newMode: AppMode, data?: any) => {
    setMode(newMode);
    if (newMode === AppMode.TEACHER_EDITOR) {
      setEditingLesson(data);
    }
    
    // Update URL hash for simple state reflection
    if (newMode === AppMode.TEACHER_DASHBOARD) window.location.hash = '/teacher';
    if (newMode === AppMode.ROLE_SELECT) window.location.hash = '';
  };

  const handleStudentLogin = () => {
    if (studentInputId.trim()) {
      setCurrentStudentId(studentInputId);
      setMode(AppMode.STUDENT_PORTAL);
      window.location.hash = `/student/${studentInputId}`;
    }
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.ROLE_SELECT:
        return (
          <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">YuetYu Tutor</h1>
                <p className="text-gray-500">Cantonese Shadowing & Learning Platform</p>
              </div>

              <div className="space-y-6">
                {/* Teacher Entry */}
                <button
                  onClick={() => navigate(AppMode.TEACHER_DASHBOARD)}
                  className="w-full flex items-center p-4 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all group"
                >
                  <div className="bg-teal-600 text-white p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">I am a Teacher</h3>
                    <p className="text-sm text-gray-500">Create content & manage students</p>
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Student Access</span>
                  </div>
                </div>

                {/* Student Entry */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                     <div className="bg-orange-500 text-white p-2 rounded-full mr-3">
                        <Book size={20} />
                     </div>
                     <h3 className="font-bold text-gray-800">I am a Student</h3>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Student ID" 
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      value={studentInputId}
                      onChange={(e) => setStudentInputId(e.target.value)}
                    />
                    <button 
                      onClick={handleStudentLogin}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
                    >
                      Go
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    *Tip: Teachers generate your unique ID link.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case AppMode.TEACHER_DASHBOARD:
        return <TeacherDashboard onNavigate={navigate} />;
      
      case AppMode.TEACHER_EDITOR:
        return <LessonEditor onNavigate={navigate} editLesson={editingLesson} />;
      
      case AppMode.STUDENT_PORTAL:
        return <StudentPortal studentId={currentStudentId} onLogout={() => navigate(AppMode.ROLE_SELECT)} />;
        
      default:
        return <div>Unknown Mode</div>;
    }
  };

  return renderContent();
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;