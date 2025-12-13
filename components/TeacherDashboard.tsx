import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Lesson, Student, AppMode, ClassroomData } from '../types';
import { Plus, Users, Trash2, Edit, History, FileDown, UploadCloud, Info, CheckCircle, Link as LinkIcon, Download, AlertTriangle } from 'lucide-react';
// @ts-ignore
import LZString from 'lz-string';

interface Props {
  onNavigate: (mode: AppMode, data?: any) => void;
}

const TeacherDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { lessons, students, addStudent, assignLesson, deleteLesson } = useData();
  const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');
  const [newStudentName, setNewStudentName] = useState('');

  const handleCreateLesson = () => {
    onNavigate(AppMode.TEACHER_EDITOR);
  };

  const handleEditLesson = (lesson: Lesson) => {
    onNavigate(AppMode.TEACHER_EDITOR, lesson);
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    addStudent(newStudentName);
    setNewStudentName('');
  };

  const handleAssign = (lessonId: string, studentId: string) => {
    assignLesson(studentId, lessonId);
    alert('Lesson assigned successfully!');
  };

  const generateShareLink = (lesson: Lesson) => {
    // Check if lesson has audio
    const hasAudio = lesson.sentences.some(s => s.audioBase64 && s.audioBase64.length > 50);
    
    let lessonToShare = lesson;

    if (hasAudio) {
      const proceed = window.confirm(
        "Link Limit Warning:\n\nThis lesson contains audio recordings. Audio is too large for a web link.\n\n" +
        "• Click OK to generate a 'Text & Video Only' link (Audio removed).\n" +
        "• Click Cancel to stop (Use 'Download File' if you need to share audio)."
      );

      if (!proceed) return;

      // Create a copy without audio for the link
      lessonToShare = {
        ...lesson,
        sentences: lesson.sentences.map(s => ({
          ...s,
          audioBase64: undefined // Remove audio
        }))
      };
    }
    
    // Compress
    const jsonString = JSON.stringify(lessonToShare);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    
    const url = `${window.location.origin}${window.location.pathname}#/share/${compressed}`;
    
    // Final safety check
    if (url.length > 8000) {
      alert("Even without audio, this lesson is too long for a link (too much text). Please use the Download File option.");
      return;
    }

    navigator.clipboard.writeText(url).then(() => {
        alert("Link copied!\n\n(Note: Audio was removed to fit in the link)\n\nStudent can open this link to add the lesson to their library.");
    });
  };

  const downloadLessonFile = (lesson: Lesson) => {
    const jsonString = JSON.stringify(lesson);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keep the master export for backup purposes
  const exportClassroomData = () => {
    const data: ClassroomData = {
      generatedAt: Date.now(),
      students: students,
      lessons: lessons
    };
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Full backup downloaded.");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
             Teacher Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Create lessons and share them instantly.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportClassroomData}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl hover:bg-indigo-100 transition font-medium border border-indigo-200"
          >
            <UploadCloud size={20} />
            Backup All Data
          </button>
          <button 
            onClick={handleCreateLesson}
            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700 transition shadow-md font-medium"
          >
            <Plus size={20} />
            Create Lesson
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="text-orange-600 mt-1 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-orange-800 text-lg mb-2">How to share with students?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-900">
               <div className="bg-white/60 p-3 rounded-lg">
                  <div className="font-bold flex items-center gap-2 text-teal-700">
                     <LinkIcon size={14}/> Share via Link (Text/Video)
                  </div>
                  <p className="mt-1">Best for YouTube lessons. Audio is automatically removed to keep the link short. <br/><strong>Benefit:</strong> Students click once, and it saves to their "Library" forever.</p>
               </div>
               <div className="bg-white/60 p-3 rounded-lg">
                  <div className="font-bold flex items-center gap-2 text-blue-700">
                     <Download size={14}/> Share File (Audio Support)
                  </div>
                  <p className="mt-1">If you recorded your own voice, use this. Send the file. Student opens it to add to their library.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-2 px-4 font-medium transition ${activeTab === 'lessons' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}
        >
          <div className="flex items-center gap-2">
            <History size={18} /> My Lessons ({lessons.length})
          </div>
        </button>
      </div>

      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No lessons found.</p>
              <button onClick={handleCreateLesson} className="text-teal-600 font-semibold mt-2 hover:underline">Create your first lesson</button>
            </div>
          )}
          {lessons.map(lesson => {
            const hasAudio = lesson.sentences.some(s => s.audioBase64);
            return (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{lesson.title}</h3>
                <div className="flex gap-1">
                   {hasAudio && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Has Audio"><AlertTriangle size={8}/> MIC</span>}
                   {lesson.mediaType === 'youtube' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">YT</span>}
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {lesson.sentences[0]?.english || "No content preview"}
              </p>
              
              <div className="mt-auto pt-3 border-t border-gray-100 grid grid-cols-4 gap-2">
                 <button 
                  onClick={() => generateShareLink(lesson)}
                  className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                  title="Copy Share Link (Audio Removed)"
                >
                  <LinkIcon size={16} /> Link
                </button>
                <button 
                  onClick={() => downloadLessonFile(lesson)}
                  className="col-span-1 flex items-center justify-center p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Download File (With Audio)"
                >
                  <Download size={16} />
                </button>
                 <button 
                  onClick={() => handleEditLesson(lesson)}
                  className="col-span-1 flex items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                 <button 
                  onClick={() => deleteLesson(lesson.id)}
                  className="text-xs text-red-400 hover:text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;