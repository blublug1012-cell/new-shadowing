
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Lesson, AppMode, Student } from '../types';
import { Plus, Users, Trash2, Edit, History, Link as LinkIcon, UserPlus, X, BookOpen, Download, UploadCloud, Eye, RefreshCw, FileJson, User, Printer, ArrowLeft, Volume2, Lightbulb, GraduationCap, CheckCircle } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode, data?: any) => void;
}

const TeacherDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { lessons, students, addStudent, deleteStudent, assignLesson, deleteLesson, getLessonById, exportSystemData, exportStudentData } = useData();
  const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');
  const [newStudentName, setNewStudentName] = useState('');
  
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printingLesson, setPrintingLesson] = useState<Lesson | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [exportScope, setExportScope] = useState<'all' | 'single'>('all');
  const [selectedStudentForExport, setSelectedStudentForExport] = useState<string>('');
  const [dataFileName, setDataFileName] = useState('student_data.json');
  const [isEditingFilename, setIsEditingFilename] = useState(false);

  useEffect(() => {
    if (exportScope === 'all') {
        setDataFileName('student_data.json');
    } else if (exportScope === 'single' && selectedStudentForExport) {
        const s = students.find(st => st.id === selectedStudentForExport);
        if (s) {
            const safeName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            setDataFileName(`${safeName}.json`);
        }
    }
  }, [exportScope, selectedStudentForExport, students]);

  const handleCreateLesson = () => onNavigate(AppMode.TEACHER_EDITOR);
  const handleEditLesson = (lesson: Lesson) => onNavigate(AppMode.TEACHER_EDITOR, lesson);

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    await addStudent(newStudentName);
    setNewStudentName('');
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete student "${studentName}"?`)) {
        await deleteStudent(studentId);
    }
  };

  const handleAssign = async (studentId: string, lessonId: string) => {
    if(!lessonId) return;
    await assignLesson(studentId, lessonId);
    setAssigningStudentId(null);
  };

  const generateNewFilename = () => {
    const base = dataFileName.replace('.json', '').split('_')[0];
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    setDataFileName(`${base}_${month}${day}_${hour}${minute}.json`);
    setIsEditingFilename(false);
  };

  const performExport = async () => {
      let data = (exportScope === 'single' && selectedStudentForExport) 
        ? await exportStudentData(selectedStudentForExport) 
        : await exportSystemData();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = dataFileName; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const copyStudentLink = (studentId: string, studentName: string) => {
      const baseUrl = window.location.origin + window.location.pathname;
      
      // Smart detection of which file to point to
      let targetFile = 'student_data.json';
      
      if (exportScope === 'single') {
          // If in single student mode, and this is the active student being configured
          if (selectedStudentForExport === studentId) {
              targetFile = dataFileName;
          } else {
              // Otherwise use the standard convention for this student
              targetFile = `${studentName.toLowerCase().replace(/[^a-z0-9]/g, '')}.json`;
          }
      } else {
          // All students mode - if user customized filename, use it
          targetFile = dataFileName;
      }
      
      const queryParams = new URLSearchParams();
      queryParams.set('studentId', studentId);
      if (targetFile !== 'student_data.json') {
          queryParams.set('data', targetFile);
      }
      
      const url = `${baseUrl}?${queryParams.toString()}`;
      
      navigator.clipboard.writeText(url).then(() => {
          setCopiedId(studentId);
          setTimeout(() => setCopiedId(null), 3000);
      });
  };

  const handlePrint = (lesson: Lesson) => {
      setPrintingLesson(lesson);
      setTimeout(() => {
          window.print();
          setPrintingLesson(null);
      }, 500);
  };

  const { pStudents, pLessons } = getPreviewData();

  function getPreviewData() {
    if (exportScope === 'single' && selectedStudentForExport) {
        const s = students.find(st => st.id === selectedStudentForExport);
        return s ? { pStudents: [s], pLessons: lessons.filter(l => s.assignedLessonIds.includes(l.id)) } : { pStudents: [], pLessons: [] };
    }
    return { pStudents: students, pLessons: lessons };
  }

  return (
    <div className="max-w-6xl mx-auto p-6 relative">
      {/* PRINTABLE AREA */}
      {printingLesson && (
        <div id="printable-area" className="fixed inset-0 bg-white z-[9999] overflow-y-auto p-12">
            <div className="border-b-2 border-teal-600 pb-4 mb-8">
                <h1 className="text-4xl font-bold text-gray-900">{printingLesson.title}</h1>
                <p className="text-teal-600 font-bold uppercase tracking-widest text-sm mt-1">Cantonese Handout • YuetYu Tutor</p>
            </div>
            <div className="space-y-12">
                {printingLesson.sentences.map((sentence, idx) => (
                    <div key={idx} className="break-inside-avoid pb-8 border-b border-gray-100 last:border-0">
                        <div className="flex flex-wrap gap-x-6 gap-y-8 mb-6 items-end">
                            {sentence.words.map((word, wIdx) => (
                                <div key={wIdx} className="flex flex-col items-center">
                                    <span className="text-base font-bold text-teal-600 mb-1">{word.selectedJyutping}</span>
                                    <span className="text-3xl font-serif text-gray-900">{word.char}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-teal-400">
                             <p className="text-xl italic text-gray-800 font-medium">{sentence.english}</p>
                        </div>
                        {sentence.explanationText && (
                            <div className="mt-4 p-5 bg-orange-50 rounded-xl text-sm text-gray-700 leading-relaxed border border-orange-100 flex gap-3">
                                <Lightbulb size={20} className="text-orange-500 shrink-0"/>
                                <div><strong className="block mb-1 text-orange-900">Teacher's Notes:</strong> {sentence.explanationText}</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-12 text-center text-gray-400 text-xs border-t pt-4">Generated by YuetYu Tutor Cantonese Platform</div>
        </div>
      )}
      <style>{`
        @media print {
            body > *:not(#printable-area) { display: none !important; }
            #printable-area { position: static !important; display: block !important; }
        }
      `}</style>

      {/* MODALS REMAIN THE SAME FOR BREVITY BUT ENSURE dataFileName LOGIC IS USED */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileJson size={24} className="text-teal-600"/>Data File Preview</h3>
                    <p className="text-sm text-gray-500">Content of <strong>{dataFileName}</strong></p>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
               <div>
                   <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Included Lessons ({pLessons.length})</h4>
                   <div className="flex flex-wrap gap-2">
                       {pLessons.map(l => <span key={l.id} className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-100">{l.title}</span>)}
                   </div>
               </div>
               <div>
                   <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Included Students ({pStudents.length})</h4>
                   <div className="space-y-3">
                       {pStudents.map(s => (
                           <div key={s.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                               <div className="font-bold text-gray-800">{s.name}</div>
                               <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                                   {s.assignedLessonIds.map(lid => <li key={lid}>{lessons.find(l => l.id === lid)?.title || 'Unknown'}</li>)}
                               </ul>
                           </div>
                       ))}
                   </div>
               </div>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Close</button>
                <button onClick={() => { setShowPreviewModal(false); setShowExportGuide(true); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold">Confirm & Export</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT GUIDE MODAL */}
      {showExportGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><UploadCloud size={24} className="text-teal-600"/>How to Publish</h3>
            <div className="space-y-4 text-gray-600 mb-6">
              <div className="flex gap-3"><div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div><p className="text-sm pt-1">Download <strong>{dataFileName}</strong>.</p></div>
              <div className="flex gap-3"><div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div><p className="text-sm pt-1">Upload it to your website's <code>public</code> folder on GitHub.</p></div>
              <div className="flex gap-3"><div className="bg-teal-100 text-teal-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">3</div><div><p className="text-sm pt-1">Copy the link for the student below.</p><p className="text-[10px] text-orange-600 mt-1 font-bold">The link automatically includes <code>&data={dataFileName}</code> so it knows which file to read.</p></div></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExportGuide(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={() => { performExport(); setShowExportGuide(false); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold flex items-center gap-2"><Download size={18}/> Download {dataFileName}</button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1><p className="text-gray-600 mt-1">Manage lessons, assign to students, and publish.</p></div>
            <button onClick={handleCreateLesson} className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700 transition shadow-md font-medium"><Plus size={20} />Create Lesson</button>
        </div>
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4"><div className="bg-orange-100 p-2 rounded-full text-orange-600 mt-1"><UploadCloud size={24}/></div><div><h3 className="font-bold text-orange-900 text-lg">Publish Data</h3><p className="text-sm text-orange-800/80">Choose what to export. "Single Student" creates a smaller, private file.</p></div></div>
            <div className="flex flex-col md:flex-row gap-4 items-end bg-white/50 p-4 rounded-lg border border-orange-100">
                <div className="flex-1 w-full md:w-auto"><label className="block text-xs font-bold text-orange-900 mb-1">Export Scope</label><div className="flex gap-2 p-1 bg-white rounded-lg border border-orange-200"><button onClick={() => setExportScope('all')} className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition ${exportScope === 'all' ? 'bg-orange-100 text-orange-800' : 'text-gray-500'}`}>All Students</button><button onClick={() => { setExportScope('single'); if(students.length > 0 && !selectedStudentForExport) setSelectedStudentForExport(students[0].id); }} className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition ${exportScope === 'single' ? 'bg-orange-100 text-orange-800' : 'text-gray-500'}`}>Single Student</button></div></div>
                {exportScope === 'single' && <div className="flex-1 w-full md:w-auto animate-fade-in"><label className="block text-xs font-bold text-orange-900 mb-1">Select Student</label><select className="w-full p-2 border border-orange-300 rounded-lg text-sm bg-white" value={selectedStudentForExport} onChange={(e) => setSelectedStudentForExport(e.target.value)}>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                <div className="flex-1 w-full md:w-auto"><label className="block text-xs font-bold text-orange-900 mb-1">Filename</label>{isEditingFilename ? <div className="flex items-center gap-1"><input type="text" value={dataFileName} onChange={(e) => setDataFileName(e.target.value)} className="w-full p-1.5 border border-orange-300 rounded text-sm"/><button onClick={() => setIsEditingFilename(false)} className="bg-teal-100 text-teal-700 px-2 py-1.5 rounded text-xs font-bold">OK</button></div> : <div className="flex items-center justify-between bg-white border border-orange-200 rounded px-3 py-1.5 cursor-pointer hover:border-orange-400 group" onClick={() => setIsEditingFilename(true)}><code className="text-sm font-mono text-gray-700 truncate max-w-[150px]">{dataFileName}</code><Edit size={12} className="text-gray-300 group-hover:text-orange-500"/></div>}</div>
                <div className="flex gap-2"><button onClick={() => setShowPreviewModal(true)} disabled={exportScope === 'single' && !selectedStudentForExport} className="p-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Eye size={20}/></button><button onClick={generateNewFilename} className="p-2 bg-orange-100 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-200"><RefreshCw size={20}/></button><button onClick={() => setShowExportGuide(true)} disabled={exportScope === 'single' && !selectedStudentForExport} className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md flex items-center gap-2 disabled:opacity-50"><Download size={18}/> Export</button></div>
            </div>
        </div>
      </header>

      <div className="flex gap-8 mb-6 border-b border-gray-200">
        <button onClick={() => setActiveTab('lessons')} className={`pb-3 px-2 font-medium transition text-lg flex items-center gap-2 ${activeTab === 'lessons' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'}`}><History size={20} /> My Lessons</button>
        <button onClick={() => setActiveTab('students')} className={`pb-3 px-2 font-medium transition text-lg flex items-center gap-2 ${activeTab === 'students' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'}`}><Users size={20} /> My Students</button>
      </div>

      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {lessons.length === 0 && <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed">No lessons yet.</div>}
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-gray-800 line-clamp-1">{lesson.title}</h3><span className="text-xs text-gray-400">{new Date(lesson.createdAt).toLocaleDateString()}</span></div>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 min-h-[40px]">{lesson.sentences[0]?.english || "No content"}</p>
              <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                <button onClick={() => handleEditLesson(lesson)} className="flex items-center justify-center gap-1 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-bold"><Edit size={14} /> Edit</button>
                <button onClick={() => handlePrint(lesson)} className="flex items-center justify-center gap-1 py-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg text-sm font-bold"><Printer size={14} /> PDF</button>
                <button onClick={() => deleteLesson(lesson.id)} className="flex items-center justify-center py-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-fade-in space-y-4">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-3 items-center">
              <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><UserPlus size={24} /></div>
              <input type="text" placeholder="Enter new student name..." className="flex-1 text-lg border-none outline-none" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}/>
              <button onClick={handleAddStudent} disabled={!newStudentName.trim()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">Add</button>
           </div>
           {students.map(student => (
               <div key={student.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                     <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">{student.name.charAt(0)}</div><div><h3 className="font-bold text-gray-800">{student.name}</h3><span className="text-xs text-gray-500">{student.assignedLessonIds.length} Assignments</span></div></div>
                     <div className="flex gap-2">
                         <button 
                            onClick={() => copyStudentLink(student.id, student.name)} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${copiedId === student.id ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                         >
                            {copiedId === student.id ? <><CheckCircle size={16}/> Copied!</> : <><LinkIcon size={16}/> Copy Link</>}
                         </button>
                         <button onClick={() => handleDeleteStudent(student.id, student.name)} className="text-red-400 border p-2 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
                     </div>
                  </div>
                  <div className="p-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">{student.assignedLessonIds.map(lessonId => <div key={lessonId} className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm text-sm"><span className="truncate font-medium">{getLessonById(lessonId)?.title}</span><span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Assigned</span></div>)}</div>
                     <div className="mt-2 pt-2 border-t">{assigningStudentId === student.id ? <div className="flex gap-2"><select className="flex-1 p-2 border rounded-lg text-sm" onChange={(e) => handleAssign(student.id, e.target.value)} defaultValue=""><option value="" disabled>Select lesson...</option>{lessons.filter(l => !student.assignedLessonIds.includes(l.id)).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select><button onClick={() => setAssigningStudentId(null)} className="p-2 text-gray-400"><X size={20}/></button></div> : <button onClick={() => setAssigningStudentId(student.id)} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline"><Plus size={16}/> Assign Lesson</button>}</div>
                  </div>
               </div>
             ))}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
