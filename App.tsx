import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson, ClassroomData } from './types';
import { GraduationCap, AlertTriangle, Loader2, Lock, Info, WifiOff, FileX } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  readonly props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
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
  const { isLoading, loadStaticData, students } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  
  // Teacher Auth State - GUARD
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  
  const [isTeacherLoginVisible, setIsTeacherLoginVisible] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Student State
  const [studentIdFromUrl, setStudentIdFromUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<{file: string, status: number | string} | null>(null);
  
  // Use a ref to track if we have already initialized from URL to prevent race conditions
  const hasInitializedRef = useRef(false);

  // Check for Static Data (student_data.json) & URL params
  useEffect(() => {
    const init = async () => {
        if (hasInitializedRef.current) return;

        // 1. Check URL for studentId AND custom data file
        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');
        // Default to student_data.json, but allow overriding via ?data=my_class.json
        const dataFileName = urlParams.get('data') || 'student_data.json';
        
        // IMMEDIATE ACTION: If studentId is present, force Student Portal immediately
        if (sId) {
            console.log("Student ID found in URL, switching to Student Portal...");
            setStudentIdFromUrl(sId);
            setMode(AppMode.STUDENT_PORTAL);

            // 2. Attempt to fetch static data (Only for Students)
            // CRITICAL FIX: Add cache busting timestamp to ensure fixed filenames (danny.json) load NEW data
            const fetchUrl = `/${dataFileName}?t=${new Date().getTime()}`;
            
            try {
                console.log(`Fetching data file: ${fetchUrl}`);
                const res = await fetch(fetchUrl);
                
                if (res.ok) {
                    try {
                        const data: ClassroomData = await res.json();
                        const studentExists = data.students?.some(s => s.id === sId);
                        
                        // Logic: Always load file if found, to ensure student sees what's on server
                        loadStaticData(data);
                        
                        if (!studentExists) {
                             console.warn("Student ID not found in the loaded file.");
                        }
                    } catch (jsonErr) {
                        console.error("JSON Parse Error:", jsonErr);
                        setFetchError({ file: dataFileName, status: "Invalid JSON Format" });
                    }
                } else {
                    console.warn(`Data file fetch failed: ${res.status}`);
                    // If we are a student on a new browser (no local data), this is a fatal error
                    if (students.length === 0) {
                        setFetchError({ file: dataFileName, status: res.status === 404 ? "File Not Found (404)" : res.status });
                    }
                }
            } catch (e) {
                console.error("Network Fetch Error:", e);
                // Only show network error if we have no local data fallback
                if (students.length === 0) {
                     setFetchError({ file: dataFileName, status: "Network Error" });
                }
            }
        } else {
             // Handle teacher shortcut via hash
             if (window.location.hash === '#/teacher') {
                setIsTeacherLoginVisible(true);
             }
        }
        
        hasInitializedRef.current = true;
    };
    
    // Only run if DataContext has finished its initial local DB check
    if (!isLoading) {
        init();
    }
  }, [isLoading]);

  // Handle Browser Back Button (Popstate)
  useEffect(() => {
    const handlePopState = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');

        if (sId) {
            setMode(AppMode.STUDENT_PORTAL);
            setStudentIdFromUrl(sId);
        } else {
            if (mode === AppMode.STUDENT_PORTAL) {
                setMode(AppMode.ROLE_SELECT);
            }
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mode]);

  const navigate = (newMode: AppMode, data?: any) => {
    if ((newMode === AppMode.TEACHER_DASHBOARD || newMode === AppMode.TEACHER_EDITOR) && !isTeacherAuthenticated) {
        setMode(AppMode.ROLE_SELECT);
        setIsTeacherLoginVisible(true);
        return;
    }

    setMode(newMode);
    
    if (newMode === AppMode.TEACHER_EDITOR) {
      setEditingLesson(data);
    } else if (newMode === AppMode.TEACHER_DASHBOARD) {
        setEditingLesson(undefined);
    }
    
    if (newMode === AppMode.ROLE_SELECT) {
      window.history.pushState(null, '', window.location.pathname);
      setIsTeacherLoginVisible(false);
      setTeacherPin('');
      setIsTeacherAuthenticated(false);
    }
  };

  const handleTeacherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPin === '2110') {
        setPinError('');
        setTeacherPin('');
        setIsTeacherAuthenticated(true); 
        setIsTeacherLoginVisible(false);
        setMode(AppMode.TEACHER_DASHBOARD);
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

  // FATAL ERROR SCREEN: Fetch Failed
  // This explicitly answers "Why does new browser open no data?"
  if (fetchError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border-t-4 border-red-500">
                <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileX size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-4">
                    We could not load the student data file from the server.
                </p>
                <div className="bg-gray-100 p-4 rounded-lg text-left text-sm font-mono text-gray-700 mb-6">
                    <p><strong>File:</strong> {fetchError.file}</p>
                    <p><strong>Error:</strong> {fetchError.status}</p>
                </div>
                <div className="text-sm text-gray-500 text-left bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <strong>Troubleshooting for Teacher:</strong>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Did you upload <code>{fetchError.file}</code> to the website?</li>
                        <li>Is the filename exactly correct (case-sensitive)?</li>
                        <li>If you just uploaded it, try waiting 1 minute.</li>
                    </ul>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition w-full"
                >
                    Try Again
                </button>
            </div>
        </div>
      );
  }

  const renderTeacherLogin = () => (
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

  const renderContent = () => {
    if ((mode === AppMode.TEACHER_DASHBOARD || mode === AppMode.TEACHER_EDITOR) && !isTeacherAuthenticated) {
        if (isTeacherLoginVisible) return renderTeacherLogin();
        return (
             <div className="min-h-screen flex items-center justify-center">
               <button onClick={() => setMode(AppMode.ROLE_SELECT)} className="text-teal-600 underline">Return to Home</button>
            </div>
        );
    }

    switch (mode) {
      case AppMode.ROLE_SELECT:
        if (isTeacherLoginVisible) return renderTeacherLogin();

        return (
          <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-2">YuetYu Tutor</h1>
                <p className="text-gray-500">Cantonese Shadowing & Learning Platform</p>
              </div>

              <div className="space-y-6">
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
                </div>

              </div>
            </div>
          </div>
        );
      
      case AppMode.TEACHER_DASHBOARD:
        return <TeacherDashboard onNavigate={navigate} />;
      
      case AppMode.TEACHER_EDITOR:
        return (
            <LessonEditor 
                key={editingLesson ? editingLesson.id : 'create-new-lesson'} 
                onNavigate={navigate} 
                editLesson={editingLesson} 
            />
        );
      
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