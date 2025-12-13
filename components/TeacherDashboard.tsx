import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Lesson, Student, AppMode, ClassroomData } from '../types';
import { Plus, Users, Trash2, Edit, History, FileDown, UploadCloud, Info } from 'lucide-react';

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

  // New function to export EVERYTHING
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
    link.download = `student_data.json`; // Fixed name for consistency
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert("File 'student_data.json' downloaded!\n\nINSTRUCTIONS:\n1. Move this file to the 'public' folder of your project code.\n2. Push your code to Netlify.\n3. Students will be able to access their work just by entering their ID.");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
             Teacher Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage content and deploy updates to students.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportClassroomData}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-700 transition shadow-md font-medium"
            title="Download the master data file to upload to your website"
          >
            <UploadCloud size={20} />
            Generate Website Data
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

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="text-blue-600 mt-1 shrink-0" size={20} />
        <div className="text-sm text-blue-800">
          <strong>How to send work to students:</strong>
          <ul className="list-disc ml-5 mt-1 space-y-1">
             <li>Assign lessons to students in the "Students" tab below.</li>
             <li>Click <strong>"Generate Website Data"</strong> above to download <code>student_data.json</code>.</li>
             <li>Replace the file in your project's <code>public/</code> folder with this new file and deploy.</li>
             <li>Send your website URL to students. They only need their <strong>Student ID</strong>.</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-2 px-4 font-medium transition ${activeTab === 'lessons' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}
        >
          <div className="flex items-center gap-2">
            <History size={18} /> History & Lessons ({lessons.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-2 px-4 font-medium transition ${activeTab === 'students' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500'}`}
        >
           <div className="flex items-center gap-2">
            <Users size={18} /> Students ({students.length})
          </div>
        </button>
      </div>

      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No history found.</p>
              <button onClick={handleCreateLesson} className="text-teal-600 font-semibold mt-2 hover:underline">Create your first lesson</button>
            </div>
          )}
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{lesson.title}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{new Date(lesson.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {lesson.sentences[0]?.english || "No content preview"}
              </p>
              <div className="mt-auto flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button 
                  onClick={() => deleteLesson(lesson.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete from History"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => handleEditLesson(lesson)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  title="Edit Lesson"
                >
                  <Edit size={16} /> Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-center">
             <input 
                type="text" 
                placeholder="Enter student name..." 
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
             />
             <button 
                onClick={handleAddStudent}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium"
             >
               Add Student
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map(student => (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
                    <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block select-all">
                      ID: {student.id}
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned Lessons</h4>
                  <div className="flex flex-wrap gap-2">
                    {student.assignedLessonIds.length === 0 ? (
                      <span className="text-sm text-gray-400 italic">No lessons assigned</span>
                    ) : (
                      student.assignedLessonIds.map(lid => {
                        const l = lessons.find(x => x.id === lid);
                        return l ? (
                          <span key={lid} className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-100">
                            {l.title}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Assign New Lesson</label>
                  <select 
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50 border p-2"
                    onChange={(e) => {
                      if(e.target.value) handleAssign(e.target.value, student.id);
                    }}
                    value=""
                  >
                    <option value="" disabled>Select a lesson...</option>
                    {lessons.filter(l => !student.assignedLessonIds.includes(l.id)).map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
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