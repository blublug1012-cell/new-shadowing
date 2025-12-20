
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

// Fixed ErrorBoundary extension by using Component instead of React.Component
// This ensures that 'props' and 'state' are correctly recognized as inherited members.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Removed 'override' as it was causing a compile error when inheritance was not correctly inferred.
  state: ErrorBoundaryState = { hasError: false, error: null };

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
    // this.props.children is now valid because extension of Component is fixed.
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
  const [fetchError, setFetchError] = useState<{file: string, status: string | number, detail: string} | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const urlParams = new URLSearchParams(window.location.search);
        const sId = urlParams.get('studentId');
        // Default to student_data.json if no data param provided
        const dataFileName = urlParams.get('data') || 'student_data.json';
        
        if (sId) {
            setStudentIdFromUrl(sId);
            setIsFetchingData(true);
            
            // CRITICAL FIX: Use relative path './' instead of absolute '/' 
            // This ensures it works on GitHub Pages subdirectories
            const fetchUrl = `./${dataFileName}?t=${Date.now()}`;
            
            try {
                const res = await fetch(fetchUrl);
                
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    // Detect if server returned a 404 HTML page instead of JSON
                    if (contentType && contentType.includes("text/html")) {
                        throw new Error(`The file '${dataFileName}' was not found. The server returned a webpage instead.`);
                    }

                    const data: ClassroomData = await res.json();
                    
                    if (!data.students || !data.lessons) {
                        throw new Error("Data file is valid JSON but formatted incorrectly.");
                    }

                    loadStaticData(data);
                    setMode(AppMode.STUDENT_PORTAL);
                } else {
                    setFetchError({ 
                        file: dataFileName, 
                        status: res.status === 404 ? "File Not Found (404)" : `Server Error: ${res.status}`,
                        detail: "The student link points to a file that doesn't exist on the server yet."
                    });
                }
            } catch (e: any) {
                console.error("Initialization Error:", e);
                setFetchError({ 
                    file: dataFileName, 
                    status: "Loading Failed",
                    detail: e.message || "Invalid JSON format or network error."
                });
            } finally {
                setIsFetchingData(false);
            }
        } else {
            // Check if teacher deep link
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

  if (isFetchingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="relative mb-6">
            <Loader2 className="animate-spin text-teal-600" size={64} />
            <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-200" size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Connecting to Student Portal</h2>
        <p className="text-gray-500 max-w-xs">Fetching lessons from your teacher's cloud. Please wait...</p>
      </div>
    );
  }

  if (fetchError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-8 border-red-500">
                <div className="bg-red-50 text-red-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileX size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
                <p className="text-gray-600 mb-6">We could not load <code className="bg-gray-100 px-1 rounded text-red-600">{fetchError.file}</code>.</p>
                
                <div className="bg-gray-50 p-5 rounded-xl text-left border border-gray-100 mb-8">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-1 text-sm">
                        <AlertTriangle size={14}/>
                        <span>Error Detail:</span>
                    </div>
                    <p className="text-sm font-mono text-gray-700 mb-4">{fetchError.status}</p>
                    
                    <div className="border-t border-gray-200 pt-4">
                         <h3 className="font-bold text-blue-900 mb-2 text-sm">Troubleshooting for Teacher:</h3>
                         <ul className="text-sm space-y-3 text-blue-800">
                            <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-1"/> Link looks for: <strong>{fetchError.file}</strong>. Ensure you uploaded this exact filename.</li>
                            <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-1"/> Check if file is in the <code>public</code> folder on GitHub.</li>
                            <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-1"/> If you just updated it, GitHub Pages might take 1-2 mins to sync.</li>
                         </ul>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18}/> Try Again
                    </button>
                    <button 
                        onClick={() => navigate(AppMode.ROLE_SELECT)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                    >
                        Go to Main Menu
                    </button>
                </div>
            </div>
        </div>
      );
  }

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
