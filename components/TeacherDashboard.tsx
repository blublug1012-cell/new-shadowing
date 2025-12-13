import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Lesson, AppMode, Student } from '../types';
import { Plus, Users, Trash2, Edit, History, Link as LinkIcon, UserPlus, Check, X, Share2, BookOpen, Download, AlertCircle, HelpCircle, UploadCloud, Settings } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode, data?: any) => void;
}

const TeacherDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { lessons, students, addStudent, assignLesson, deleteLesson, getLessonById, exportSystemData } = useData();
  const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');
  const [newStudentName, setNewStudentName] = useState('');
  
  // State for the "Assign Lesson" dropdown in Student view
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);

  // Export Guide Modal State
  const [showExportGuide, setShowExportGuide] = useState(false);
  
  // New: Custom Filename State
  const [dataFileName, setDataFileName] = useState('student_data.json');
  const [isEditingFilename, setIsEditingFilename] = useState(false);

  const handleCreateLesson = () => {
    onNavigate(AppMode.TEACHER_EDITOR);
  };

  const handleEditLesson = (lesson: Lesson) => {
    onNavigate(AppMode.TEACHER_EDITOR, lesson);
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    await addStudent(newStudentName);
    setNewStudentName('');
  };

  const handleAssign = async (studentId: string, lessonId: string) => {
    if(!lessonId) return;
    await assignLesson(studentId, lessonId);
    setAssigningStudentId(null);
  };

  // 1. Export Data Logic
  const performExport = async () => {
      const data = await exportSystemData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      // Use the custom filename configured by the user
      link.download = dataFileName; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // 2. Generate Link Logic (Updated to include data filename)
  const copyStudentLink = (studentId: string, studentName: string) => {
      const baseUrl = window.location.origin + window.location.pathname;
      let url = `${baseUrl}?studentId=${studentId}`;
      
      // Only append data param if it's NOT the default student_data.json
      // This keeps URLs short for the standard use case
      if (dataFileName !== 'student_data.json') {
          url += `&data=${dataFileName}`;
      }
      
      navigator.clipboard.writeText(url).then(() => {
          alert(`Link copied for ${studentName}!\n\n${url}\n\nIMPORTANT: Ensure you have uploaded the file named '${dataFileName}' to your website.`);
      });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
      {/* EXPORT INSTRUCTION MODAL */}
      {showExportGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <UploadCloud size={24} className="text-teal-600"/>
              How to Publish Updates
            </h3>
            
            <div className="space-y-4 text-gray-600 mb-6">
              <div className="flex gap-3">
                 <div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                 <div>
                    <p className="text-sm pt-1">Click <strong>Download Data</strong> below.</p>
                 </div>
              </div>
              <div className="flex gap-3">
                 <div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                 <div>
                    <p className="text-sm pt-1 font-bold text-gray-800">Check the filename!</p>
                    <p className="text-sm mt-1">Make sure the file is named exactly: <br/><code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-xs">{dataFileName}</code></p>
                 </div>
              </div>
              <div className="flex gap-3">
                 <div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                 <p className="text-sm pt-1">Upload this file to your website's <code>public</code> folder (Github).</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowExportGuide(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  performExport();
                  setShowExportGuide(false);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
              >
                <Download size={18}/> Download Data
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                Teacher Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Manage lessons, assign to students, and publish.</p>
            </div>
            <div className="flex gap-3">
            <button 
                onClick={handleCreateLesson}
                className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700 transition shadow-md font-medium"
            >
                <Plus size={20} />
                Create Lesson
            </button>
            </div>
        </div>
        
        {/* Publication Area */}
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-full text-orange-600 mt-1">
                        <UploadCloud size={20}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-orange-800">Publish Changes</h3>
                        <p className="text-sm text-orange-700">Any changes are only visible after you update the website data.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowExportGuide(true)}
                    className="flex items-center gap-2 bg-white text-orange-700 border border-orange-300 px-4 py-2 rounded-lg font-bold hover:bg-orange-100 shadow-sm shrink-0"
                >
                    <Download size={18}/> Export Website Data
                </button>
            </div>

            {/* Advanced File Settings */}
            <div className="border-t border-orange-200 pt-3 flex items-center gap-2 text-sm text-orange-800">
                <Settings size={14} />
                <span>Current Data File:</span>
                {isEditingFilename ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={dataFileName} 
                            onChange={(e) => setDataFileName(e.target.value)}
                            className="px-2 py-1 rounded border border-orange-300 text-gray-700 focus:outline-none focus:border-orange-500"
                        />
                        <button onClick={() => setIsEditingFilename(false)} className="text-teal-600 hover:underline">Done</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <code className="bg-white/50 px-2 py-0.5 rounded font-mono font-bold">{dataFileName}</code>
                        <button onClick={() => setIsEditingFilename(true)} className="text-orange-600 hover:text-orange-900 underline text-xs">Change Filename</button>
                    </div>
                )}
                <span className="text-xs text-orange-600/70 ml-2 hidden md:inline">(Only change this if you are managing multiple class files)</span>
            </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-8 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 px-2 font-medium transition text-lg flex items-center gap-2 ${activeTab === 'lessons' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <History size={20} /> My Lessons
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-2 font-medium transition text-lg flex items-center gap-2 ${activeTab === 'students' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users size={20} /> My Students
        </button>
      </div>

      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {lessons.length === 0 && (
            <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-lg">No lessons created yet.</p>
              <button onClick={handleCreateLesson} className="text-teal-600 font-bold mt-2 hover:underline">Create your first lesson</button>
            </div>
          )}
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{lesson.title}</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                   {new Date(lesson.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 min-h-[40px]">
                {lesson.sentences[0]?.english || "No content preview"}
              </p>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                 <button 
                  onClick={() => handleEditLesson(lesson)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                >
                  <Edit size={16} /> Edit
                </button>
                <button 
                  onClick={() => deleteLesson(lesson.id)}
                  className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-fade-in">
           {/* Add Student Bar */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-3 items-center">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                  <UserPlus size={24} />
              </div>
              <input 
                type="text" 
                placeholder="Enter new student name..." 
                className="flex-1 text-lg border-none outline-none focus:ring-0 text-gray-700"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
              />
              <button 
                onClick={handleAddStudent}
                disabled={!newStudentName.trim()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
           </div>

           <div className="space-y-4">
             {students.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No students added. Add a student to start distributing lessons.
                </div>
             )}
             
             {students.map(student => (
               <div key={student.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                           {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                            <span className="text-xs text-gray-500">{student.assignedLessonIds.length} Assignments</span>
                        </div>
                     </div>
                     <button
                        onClick={() => copyStudentLink(student.id, student.name)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
                     >
                        <LinkIcon size={16}/> Copy Link
                     </button>
                  </div>
                  
                  <div className="p-4">
                     {/* Assigned Lessons List */}
                     {student.assignedLessonIds.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                           {student.assignedLessonIds.map(lessonId => {
                              const lesson = getLessonById(lessonId);
                              if (!lesson) return null;
                              return (
                                <div key={lessonId} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                      <BookOpen size={16} className="text-teal-500 shrink-0"/>
                                      <span className="truncate text-gray-700 font-medium">{lesson.title}</span>
                                   </div>
                                   <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Assigned</span>
                                </div>
                              );
                           })}
                        </div>
                     ) : (
                        <p className="text-gray-400 text-sm italic mb-4">No lessons assigned yet.</p>
                     )}

                     {/* Assign Action */}
                     <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        {assigningStudentId === student.id ? (
                           <div className="flex items-center gap-2 flex-1 animate-fade-in">
                              <select 
                                className="flex-1 p-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                                onChange={(e) => handleAssign(student.id, e.target.value)}
                                defaultValue=""
                              >
                                 <option value="" disabled>Select a lesson to assign...</option>
                                 {lessons
                                    .filter(l => !student.assignedLessonIds.includes(l.id))
                                    .map(l => (
                                       <option key={l.id} value={l.id}>{l.title}</option>
                                    ))
                                 }
                              </select>
                              <button 
                                onClick={() => setAssigningStudentId(null)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                              >
                                 <X size={20}/>
                              </button>
                           </div>
                        ) : (
                           <button 
                             onClick={() => setAssigningStudentId(student.id)}
                             className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline"
                           >
                              <Plus size={16}/> Assign Lesson
                           </button>
                        )}
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;