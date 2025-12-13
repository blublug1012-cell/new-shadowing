import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import TeacherDashboard from './components/TeacherDashboard';
import LessonEditor from './components/LessonEditor';
import StudentPortal from './components/StudentPortal';
import { AppMode, Lesson } from './types';
import { GraduationCap, BookOpen, AlertTriangle, Loader2, UploadCloud, Lock, PlayCircle } from 'lucide-react';
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
  const { isLoading, addLesson } = useData();
  const [mode, setMode] = useState<AppMode>(AppMode.ROLE_SELECT);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  
  // Teacher Auth State
  const [isTeacherLoginVisible, setIsTeacherLoginVisible] = useState(false);
  const [teacherPin, setTeacherPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Student State
  const [importMessage, setImportMessage] = useState('');

  // Handle URL Hashes for Sharing
  useEffect(() => {
    const processHash = async () => {
      const hash = window.location.hash;
      
      // Check for shared lesson link: #/share/COMPRESSED_DATA
      if (hash.startsWith('#/share/')) {
        try {
          const compressed = hash.replace('#/share/', '');
          const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
          
          if (decompressed) {
            const lesson = JSON.parse(decompressed) as Lesson;
            
            // SAVE TO DB automatically
            await addLesson(lesson);
            
            setImportMessage(`Success! Lesson "${lesson.title}" has been added to your library.`);
            window.location.hash = ''; // Clear hash
            setMode(AppMode.STUDENT_PORTAL);
          }
        } catch (e) {
          console.error("Failed to parse shared link", e);
          alert("Invalid or broken share link.");
        }
      }

      // Teacher login shortcut
      if (hash === '#/teacher') {
        window.location.hash = ''; 
        setIsTeacherLoginVisible(true);
      }
    };

    if (!isLoading) {
      processHash();
    }
  }, [isLoading, addLesson]);

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

  const handleManualUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Handle single lesson file import
        if (json.title && json.sentences) {
           await addLesson(json);
           setImportMessage(`Lesson "${json.title}" imported!`);
           setMode(AppMode.STUDENT_PORTAL);
           return;
        }

        // Handle bulk file (legacy or backup)
        if (json.lessons && Array.isArray(json.lessons)) {
             let count = 0;
             for (const l of json.lessons) {
               await addLesson(l);
               count++;
             }
             setImportMessage(`${count} lessons imported.`);
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
        <p className="text-gray-500 font-medium">Loading your library...</p>
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
                    <p className="text-sm text-gray-500">Create content & share links</p>
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

                {/* Student Entry - DIRECT LIBRARY ACCESS */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
                   <div className="mb-4">
                     <h3 className="font-bold text-xl text-gray-800">Student Area</h3>
                     <p className="text-sm text-gray-500 mt-1">Access your saved lessons</p>
                   </div>
                   
                   <button 
                    onClick={() => setMode(AppMode.STUDENT_PORTAL)}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 mb-4"
                  >
                    <BookOpen size={24} />
                    Enter My Library
                  </button>

                  <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                     <span className="font-semibold text-gray-600 block mb-1">How to add lessons?</span>
                     Ask your teacher for a <strong>Link</strong> or a <strong>File</strong>.<br/>
                     When you click the link, the lesson is automatically added here.
                  </div>

                  <label 
                    className="inline-flex items-center gap-2 text-xs text-teal-600 cursor-pointer hover:text-teal-800 font-medium py-2"
                  >
                    <UploadCloud size={14}/>
                    <span>Have a file? Click to Import</span>
                    <input type="file" className="hidden" accept=".json" onChange={handleManualUpload} />
                  </label>
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
            importMessage={importMessage}
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