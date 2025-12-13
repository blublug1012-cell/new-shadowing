import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson, ClassroomData } from './types';
import { GraduationCap, BookOpen, AlertTriangle, Loader2, UploadCloud, Lock, PlayCircle, Info } from 'lucide-react';
// @ts-ignore
import LZString from 'lz-string';

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

// Separate component to use hook
const AppLogic: React.FC = () => {
  const { isLoading, addLesson, loadStaticData } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  
  // Teacher Auth State
  const [isTeacherLoginVisible, setIsTeacherLoginVisible] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Student State
  const [studentIdFromUrl, setStudentIdFromUrl] = useState<string | null>(null);

  // Check for Static Data (student_data.json) & URL params
  useEffect(() => {
    const init = async () => {
        // 1. Check URL for studentId AND custom data file
        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');
        // Default to student_data.json, but allow overriding via ?data=my_class.json
        const dataFileName = urlParams.get('data') || 'student_data.json';
        
        // 2. Attempt to fetch static data (Deployed Mode)
        // We add a timestamp query param to bypass browser caching (critical for file-based CMS)
        try {
            const res = await fetch(`/${dataFileName}?v=${new Date().getTime()}`);
            if (res.ok) {
                const data: ClassroomData = await res.json();
                console.log(`Static data loaded from ${dataFileName}`, data);
                // Load data into context (sets isReadOnly=true)
                loadStaticData(data);
            } else {
                console.warn(`${dataFileName} not found (404) or failed to load.`);
            }
        } catch (e) {
            console.log("Fetch error (offline/local). Using local DB data.");
        }
        
        // 3. Auto-enter Student Portal if ID is present
        // This runs REGARDLESS of whether static data fetch worked.
        if (sId) {
            setStudentIdFromUrl(sId);
            setMode(AppMode.STUDENT_PORTAL);
        }
        
        // Handle teacher shortcut
        if (window.location.hash === '#/teacher') {
            window.location.hash = '';
            setIsTeacherLoginVisible(true);
        }
    };
    
    // Only run if not already loading (initial mount)
    if (!isLoading) {
        init();
    }
  }, [isLoading]);

  const navigate = (newMode: AppMode, data?: any) => {
    setMode(newMode);
    if (newMode === AppMode.TEACHER_EDITOR) {
      setEditingLesson(data);
    }
    
    if (newMode === AppMode.TEACHER_DASHBOARD) window.location.hash = '/teacher';
    
    if (newMode === AppMode.ROLE_SELECT) {
      window.location.hash = '';
      setIsTeacherLoginVisible(false);
      setTeacherPin('');
    }
  };

  const handleTeacherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPin === '2110') {
        setPinError('');
        setTeacherPin('');
        setIsTeacherLoginVisible(false);
        navigate(AppMode.TEACHER_DASHBOARD);
    } else {
        setPinError('Incorrect Access Code');
        setTeacherPin(''); 
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case AppMode.ROLE_SELECT:
        if (isTeacherLoginVisible) {
          return (
             <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in">
                  <div className="text-center mb-6">
                    <div className="bg-teal-100 text-teal-600 p-3 rounded-full inline-block mb-3">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Teacher Access</h2>
                    <p className="text-gray-500 text-sm">Please enter the access code to continue.</p>
                  </div>

                  <form onSubmit={handleTeacherLoginSubmit} className="space-y-4">
                     <div>
                        <input 
                            type="password" 
                            autoFocus
                            placeholder="Enter Code"
                            className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none"
                            value={teacherPin}
                            onChange={(e) => setTeacherPin(e.target.value)}
                        />
                        {pinError && <p className="text-red-500 text-sm text-center mt-2">{pinError}</p>}
                     </div>
                     
                     <button 
                        type="submit"
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition"
                     >
                        Verify Access
                     </button>
                     <button 
                        type="button"
                        onClick={() => {
                            setIsTeacherLoginVisible(false);
                            setTeacherPin('');
                            setPinError('');
                        }}
                        className="w-full text-gray-500 py-2 hover:text-gray-700 text-sm"
                     >
                        Cancel
                     </button>
                  </form>
                </div>
              </div>
          );
        }

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
                  onClick={() => setIsTeacherLoginVisible(true)}
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
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                   <div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-gray-500">Student Access</span></div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                    <div className="text-gray-400 mb-2">
                        <Info size={32} className="mx-auto"/>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                        Students should use the <strong>personal link</strong> provided by the teacher to access their exercises directly.
                    </p>
                    <p className="text-xs text-gray-400">
                        (If you are testing, please use the Teacher Dashboard to generate a student link)
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
        return (
          <StudentPortal 
            onLogout={() => navigate(AppMode.ROLE_SELECT)} 
            studentId={studentIdFromUrl || undefined}
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
        <AppLogic />
      </DataProvider>
    </ErrorBoundary>
  );
};

export default App;