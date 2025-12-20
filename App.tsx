
import React, { Component, useState, useEffect, ReactNode, useRef } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson, ClassroomData } from './types';
import { GraduationCap, AlertTriangle, Loader2, Lock, Info, FileX, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary by using React.Component and initializing state correctly
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Using property initialization for state
  override state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-bold"
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

const AppLogic: React.FC = () => {
  const { isLoading, loadStaticData } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [isTeacherLoginVisible, setIsTeacherLoginVisible] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [studentIdFromUrl, setStudentIdFromUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<{file: string, status: string | number} | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
        // PREVENT DOUBLE INIT - This was likely causing the flicker/error
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');
        const dataFileName = urlParams.get('data') || 'student_data.json';
        
        if (sId) {
            setStudentIdFromUrl(sId);
            setIsFetchingData(true);
            
            // Cache busting URL
            const fetchUrl = `/${dataFileName}?t=${Date.now()}`;
            
            try {
                const res = await fetch(fetchUrl);
                
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    if (contentType && !contentType.includes("application/json")) {
                        throw new Error("Server returned HTML (likely a 404 page) instead of JSON.");
                    }

                    const data: ClassroomData = await res.json();
                    
                    // Verify data structure minimally
                    if (!data.students || !data.lessons) {
                        throw new Error("Data file is valid JSON but missing student/lesson fields.");
                    }

                    loadStaticData(data);
                    setMode(AppMode.STUDENT_PORTAL);
                } else {
                    setFetchError({ 
                        file: dataFileName, 
                        status: res.status === 404 ? "File Not Found (404)" : `Server Error: ${res.status}` 
                    });
                }
            } catch (e: any) {
                console.error("Initialization Error:", e);
                setFetchError({ 
                    file: dataFileName, 
                    status: e.message.includes("JSON") ? "Invalid JSON format. Check if the file is empty or corrupted." : e.message 
                });
            } finally {
                setIsFetchingData(false);
            }
        } else {
            if (window.location.hash === '#/teacher') {
                setIsTeacherLoginVisible(true);
            }
        }
    };
    
    if (!isLoading) {
        init();
    }
  }, [isLoading, loadStaticData]);

  const navigate = (newMode: AppMode, data?: any) => {
    if ((newMode === AppMode.TEACHER_DASHBOARD || newMode === AppMode.TEACHER_EDITOR) && !isTeacherAuthenticated) {
        setMode(AppMode.ROLE_SELECT);
        setIsTeacherLoginVisible(true);
        return;
    }

    setMode(newMode);
    if (newMode === AppMode.TEACHER_EDITOR) setEditingLesson(data);
    else if (newMode === AppMode.TEACHER_DASHBOARD) setEditingLesson(undefined);
    
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

  // If we are currently fetching remote student data, show ONLY the loader
  if (isFetchingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="relative mb-6">
            <Loader2 className="animate-spin text-teal-600" size={64} />
            <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-200" size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Connecting to Student Portal</h2>
        <p className="text-gray-500 max-w-xs">Loading classroom lessons. Please wait a moment...</p>
      </div>
    );
  }

  // Handle Fetch Errors
  if (fetchError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border-t-4 border-red-500">
                <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileX size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-4 text-sm">We could not load <strong>{fetchError.file}</strong> from the server.</p>
                <div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-gray-700 mb-6 border border-gray-200">
                    <p><strong>Reason:</strong> {fetchError.status}</p>
                </div>
                <div className="text-left bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                    <h3 className="font-bold text-blue-800 mb-2">Troubleshooting for Teacher:</h3>
                    <ul className="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Did you upload <code>{fetchError.file}</code> to your website?</li>
                        <li>Is the filename EXACTLY correct (case-sensitive)?</li>
                        <li>If you just uploaded it, wait 1 minute for the cache to clear.</li>
                    </ul>
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-6 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition w-full shadow-lg"
                >
                    Try Again
                </button>
            </div>
        </div>
      );
  }

  // Fallback Loading for general App state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-teal-600" size={48} />
      </div>
    );
  }

  const renderContent = () => {
    if (isTeacherLoginVisible) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in">
                 <div className="text-center mb-6">
                   <div className="bg-teal-100 text-teal-600 p-3 rounded-full inline-block mb-3"><Lock size={32} /></div>
                   <h2 className="text-2xl font-bold text-gray-800">Teacher Access</h2>
                   <p className="text-gray-500 text-sm">Enter the access code to continue.</p>
                 </div>
                 <form onSubmit={handleTeacherLoginSubmit} className="space-y-4">
                    <input type="password" autoFocus placeholder="Enter Code" className="w-full text-center text-3xl tracking-widest border border-gray-300 rounded-xl px-4 py-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all" value={teacherPin} onChange={(e) => setTeacherPin(e.target.value)} />
                    {pinError && <p className="text-red-500 text-sm text-center font-medium animate-pulse">{pinError}</p>}
                    <button type="submit" className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg text-lg">Verify Access</button>
                    <button type="button" onClick={() => { setIsTeacherLoginVisible(false); setTeacherPin(''); setPinError(''); }} className="w-full text-gray-400 py-2 hover:text-gray-600 text-sm font-medium">Cancel</button>
                 </form>
               </div>
             </div>
        );
    }

    switch (mode) {
      case AppMode.ROLE_SELECT:
        return (
          <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-10">
                <div className="inline-block p-4 bg-teal-50 rounded-2xl mb-4">
                    <GraduationCap size={48} className="text-teal-600"/>
                </div>
                <h1 className="text-4xl font-black text-gray-800 mb-2">YuetYu Tutor</h1>
                <p className="text-gray-500 font-medium">Cantonese Shadowing Platform</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => setIsTeacherLoginVisible(true)} className="w-full flex items-center p-5 bg-teal-50 hover:bg-teal-100 border-2 border-teal-100 rounded-2xl transition-all group">
                  <div className="bg-teal-600 text-white p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform shadow-md"><GraduationCap size={24} /></div>
                  <div className="text-left"><h3 className="font-bold text-gray-800 text-lg">I am a Teacher</h3><p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Create content & manage students</p></div>
                </button>
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                    <Info size={24} className="mx-auto text-gray-300 mb-2"/>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">Students should use the <strong>personal link</strong> provided by their teacher.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case AppMode.TEACHER_DASHBOARD: return <TeacherDashboard onNavigate={navigate} />;
      case AppMode.TEACHER_EDITOR: return <LessonEditor key={editingLesson?.id || 'new'} onNavigate={navigate} editLesson={editingLesson} />;
      case AppMode.STUDENT_PORTAL: return <StudentPortal onLogout={() => navigate(AppMode.ROLE_SELECT)} studentId={studentIdFromUrl || undefined} />;
      default: return <div className="p-20 text-center font-bold text-red-500">Unknown Application Mode</div>;
    }
  };

  return renderContent();
};

const App: React.FC = () => (
  <ErrorBoundary>
    <DataProvider>
      <AppLogic />
    </DataProvider>
  </ErrorBoundary>
);

export default App;
