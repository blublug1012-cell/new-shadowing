
import React, { Component, useState, useEffect, ReactNode, useRef } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson, ClassroomData } from './types';
import { GraduationCap, AlertTriangle, Loader2, Lock, Info, FileX, RefreshCw, ChevronRight } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ErrorBoundary must inherit from React.Component to have access to this.props and this.state correctly in TS
// Fix: Added a constructor that calls super(props) to ensure 'props' is recognized on the instance.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
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
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-red-100 text-center">
            <div className="flex flex-col items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={48} />
              <h1 className="text-xl font-bold">Unexpected Error</h1>
            </div>
            <p className="text-gray-600 mb-6">The application encountered a critical error. Your data is likely safe in the browser's storage.</p>
            <div className="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-40 mb-6 text-left border border-gray-200">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-teal-600 text-white py-3 rounded-xl hover:bg-teal-700 font-bold shadow-lg"
            >
              Refresh Application
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
  const [fetchError, setFetchError] = useState<{file: string, url: string, status: string | number, detail: string} | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');
        const dataFileName = urlParams.get('data') || 'student_data.json';
        
        if (sId) {
            setStudentIdFromUrl(sId);
            setIsFetchingData(true);
            
            // Resolve relative path based on current location to support subfolders
            const fetchUrl = `${dataFileName}?t=${Date.now()}`;
            const fullUrlForDisplay = new URL(fetchUrl, window.location.href).href;
            
            try {
                const res = await fetch(fetchUrl);
                
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("text/html")) {
                        throw new Error(`The file '${dataFileName}' was not found. The server returned a webpage instead of JSON.`);
                    }

                    const data: ClassroomData = await res.json();
                    if (!data.students || !data.lessons) {
                        throw new Error("The file exists but the format is invalid.");
                    }

                    loadStaticData(data);
                    setMode(AppMode.STUDENT_PORTAL);
                } else {
                    setFetchError({ 
                        file: dataFileName, 
                        url: fullUrlForDisplay,
                        status: res.status === 404 ? "File Not Found (404)" : `Status: ${res.status}`,
                        detail: `The app tried to find the file at: ${fullUrlForDisplay}`
                    });
                }
            } catch (e: any) {
                setFetchError({ 
                    file: dataFileName, 
                    url: fullUrlForDisplay,
                    status: "Loading Failed",
                    detail: e.message || "Network error or invalid JSON content."
                });
            } finally {
                setIsFetchingData(false);
            }
        } else if (window.location.hash === '#/teacher') {
            setIsTeacherLoginVisible(true);
        }
    };
    
    if (!isLoading) init();
  }, [isLoading, loadStaticData]);

  const navigate = (newMode: AppMode, data?: any) => {
    if ((newMode === AppMode.TEACHER_DASHBOARD || newMode === AppMode.TEACHER_EDITOR) && !isTeacherAuthenticated) {
        setIsTeacherLoginVisible(true);
        return;
    }
    setMode(newMode);
    if (newMode === AppMode.TEACHER_EDITOR) setEditingLesson(data);
    else if (newMode === AppMode.TEACHER_DASHBOARD) setEditingLesson(undefined);
  };

  const handleTeacherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPin === '2110') {
        setIsTeacherAuthenticated(true); 
        setIsTeacherLoginVisible(false);
        setMode(AppMode.TEACHER_DASHBOARD);
    } else {
        setPinError('Incorrect Code');
    }
  };

  if (isFetchingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-800">Connecting...</h2>
      </div>
    );
  }

  if (fetchError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-8 border-red-500">
                <FileX size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-4">Tried to load: <code className="bg-gray-100 px-1 rounded text-red-600">{fetchError.file}</code></p>
                
                <div className="bg-gray-50 p-4 rounded-xl text-left text-sm border border-gray-200 mb-6">
                    <p className="font-bold text-red-700 mb-1">Error Detail:</p>
                    <p className="font-mono text-gray-600 break-all">{fetchError.status}</p>
                    <p className="mt-2 text-gray-500 italic break-all">{fetchError.detail}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={() => window.location.reload()} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 transition shadow-md">
                        <RefreshCw size={18}/> Try Again
                    </button>
                    <button onClick={() => setMode(AppMode.ROLE_SELECT)} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Back to Menu</button>
                </div>
            </div>
        </div>
      );
  }

  const renderContent = () => {
    if (isTeacherLoginVisible) {
        return (
            <div className="min-h-screen bg-teal-600 flex items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                 <div className="text-center mb-6">
                   <Lock size={32} className="text-teal-600 mx-auto mb-2" />
                   <h2 className="text-2xl font-bold text-gray-800">Teacher Access</h2>
                 </div>
                 <form onSubmit={handleTeacherLoginSubmit} className="space-y-4">
                    <input type="password" autoFocus placeholder="Enter Pin" className="w-full text-center text-3xl border border-gray-300 rounded-xl py-3 focus:ring-4 focus:ring-teal-500/20 outline-none" value={teacherPin} onChange={(e) => setTeacherPin(e.target.value)} />
                    {pinError && <p className="text-red-500 text-sm text-center font-bold">{pinError}</p>}
                    <button type="submit" className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg">Login</button>
                 </form>
               </div>
             </div>
        );
    }

    switch (mode) {
      case AppMode.ROLE_SELECT:
        return (
          <div className="min-h-screen bg-teal-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
              <GraduationCap size={64} className="text-teal-600 mx-auto mb-6"/>
              <h1 className="text-3xl font-black text-gray-800 mb-8">YuetYu Tutor</h1>
              <div className="space-y-4">
                <button onClick={() => setIsTeacherLoginVisible(true)} className="w-full p-5 bg-teal-50 hover:bg-teal-100 border-2 border-teal-100 rounded-2xl transition group flex items-center gap-4">
                  <div className="bg-teal-600 text-white p-3 rounded-xl"><GraduationCap size={24} /></div>
                  <div className="text-left font-bold text-gray-800">Teacher Dashboard</div>
                </button>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500 leading-relaxed">
                   Students: Please use the personal link shared by your teacher.
                </div>
              </div>
            </div>
          </div>
        );
      case AppMode.TEACHER_DASHBOARD: return <TeacherDashboard onNavigate={navigate} />;
      case AppMode.TEACHER_EDITOR: return <LessonEditor onNavigate={navigate} editLesson={editingLesson} />;
      case AppMode.STUDENT_PORTAL: return <StudentPortal onLogout={() => setMode(AppMode.ROLE_SELECT)} studentId={studentIdFromUrl || undefined} />;
      default: return null;
    }
  };

  return <ErrorBoundary>{renderContent()}</ErrorBoundary>;
};

const App: React.FC = () => (
  <DataProvider>
    <AppLogic />
  </DataProvider>
);

export default App;
