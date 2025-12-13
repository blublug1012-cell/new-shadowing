import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson, ClassroomData, StudentPackage } from './types';
import { GraduationCap, Book, AlertTriangle, Loader2, UploadCloud, ArrowRight } from 'lucide-react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={32} />
              <h1 className="text-xl font-bold">Something went wrong</h1>
            </div>
            <p className="text-gray-600 mb-4">The application encountered an unexpected error.</p>
            <div className="bg-gray-100 p-4 rounded text-sm font-mono overflow-auto max-h-40 mb-4">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { isLoading } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  
  // State for student flow
  const [classroomData, setClassroomData] = useState<ClassroomData | null>(null);
  const [studentInputId, setStudentInputId] = useState('');
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [studentPackage, setStudentPackage] = useState<StudentPackage | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/teacher') {
        setMode(AppMode.TEACHER_DASHBOARD);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newMode: AppMode, data?: any) => {
    setMode(newMode);
    if (newMode === AppMode.TEACHER_EDITOR) {
      setEditingLesson(data);
    }
    if (newMode === AppMode.TEACHER_DASHBOARD) window.location.hash = '/teacher';
    if (newMode === AppMode.ROLE_SELECT) {
      window.location.hash = '';
      setStudentPackage(null);
      setStudentInputId('');
      setFetchError('');
    }
  };

  const handleStudentLogin = async () => {
    if (!studentInputId.trim()) return;
    
    setIsFetchingData(true);
    setFetchError('');

    try {
      let data = classroomData;
      
      // If we haven't fetched the master file yet, do it now
      if (!data) {
        // Add timestamp to prevent caching
        const response = await fetch(`/student_data.json?t=${Date.now()}`);
        if (!response.ok) {
           throw new Error("Could not find classroom data. Please contact your teacher.");
        }
        data = await response.json() as ClassroomData;
        setClassroomData(data);
      }

      // Find the student
      const student = data.students.find(s => s.id === studentInputId.trim());
      
      if (!student) {
        setFetchError("Student ID not found.");
        setIsFetchingData(false);
        return;
      }

      // Filter lessons for this student
      const assignedLessons = data.lessons.filter(l => student.assignedLessonIds.includes(l.id));

      const pkg: StudentPackage = {
        studentName: student.name,
        generatedAt: data.generatedAt,
        lessons: assignedLessons
      };

      setStudentPackage(pkg);
      setMode(AppMode.STUDENT_PORTAL);

    } catch (err) {
      console.error(err);
      setFetchError("Could not load data. Has the teacher uploaded the 'student_data.json' file?");
    } finally {
      setIsFetchingData(false);
    }
  };

  // Allow manual upload fallback
  const handleManualUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Handle both simple package and classroom data
        if (json.students && json.lessons) {
             // It's a master file, set it and ask for ID
             setClassroomData(json);
             alert("File loaded. Please enter your ID now.");
        } else if (json.lessons && json.studentName) {
             // It's a single student package
             setStudentPackage(json);
             setMode(AppMode.STUDENT_PORTAL);
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Loading your data...</p>
      </div>
    );
  }

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
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center mb-4">
                     <div className="bg-orange-500 text-white p-2 rounded-full mr-3">
                        <Book size={20} />
                     </div>
                     <h3 className="font-bold text-gray-800">Student Login</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        placeholder="Enter your Student ID" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        value={studentInputId}
                        onChange={(e) => setStudentInputId(e.target.value)}
                      />
                      {fetchError && <p className="text-xs text-red-500 mt-1">{fetchError}</p>}
                    </div>
                    
                    <button 
                      onClick={handleStudentLogin}
                      disabled={isFetchingData || !studentInputId}
                      className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isFetchingData ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}
                      {isFetchingData ? "Checking..." : "Enter Class"}
                    </button>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <label 
                      className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 underline flex items-center justify-center gap-1"
                    >
                      <UploadCloud size={12}/>
                      Or upload file manually
                      <input type="file" className="hidden" accept=".json" onChange={handleManualUpload} />
                    </label>
                  </div>
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
        return (
          <StudentPortal 
            importedPackage={studentPackage} 
            onLogout={() => navigate(AppMode.ROLE_SELECT)} 
          />
        );
        
      default:
        return <div>Unknown Mode</div>;
    }
  };

  return renderContent();
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ErrorBoundary>
  );
};

export default App;