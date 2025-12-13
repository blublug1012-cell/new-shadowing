import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Lesson, Student, AppMode } from '../types';
import { ArrowLeft, Play, Pause, Download, Volume2, User } from 'lucide-react';

interface Props {
  studentId: string;
  onLogout: () => void;
}

const StudentPortal: React.FC<Props> = ({ studentId, onLogout }) => {
  const { getStudentById, getLessonById } = useData();
  const student = getStudentById(studentId);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Audio Playback State
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-4">The ID provided does not match our records.</p>
          <button onClick={onLogout} className="text-teal-600 hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  const handlePlayAudio = (base64: string | undefined, sentenceId: string) => {
    if (!base64) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      if (playingSentenceId === sentenceId) {
        setPlayingSentenceId(null);
        return;
      }
    }

    const audio = new Audio(base64);
    audioRef.current = audio;
    setPlayingSentenceId(sentenceId);
    
    audio.play();
    audio.onended = () => setPlayingSentenceId(null);
  };

  const handleDownloadPDF = async () => {
    // We use a specific ID to capture the content area
    const element = document.getElementById('printable-lesson-content');
    if (!element) return;

    // @ts-ignore - html2canvas is loaded via CDN in index.html
    if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      alert("PDF libraries loading. Please wait...");
      return;
    }

    try {
       // @ts-ignore
      const canvas = await window.html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeLesson?.title || 'Lesson'}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF.");
    }
  };

  // Lesson Detail View
  if (activeLesson) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
          <button 
            onClick={() => setActiveLesson(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 font-medium"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-full text-sm hover:bg-teal-700 shadow-sm"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div id="printable-lesson-content" className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{activeLesson.title}</h1>
            <p className="text-gray-500 mb-8 text-sm">Created: {new Date(activeLesson.createdAt).toLocaleDateString()}</p>
            
            {activeLesson.mediaUrl && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-md">
                 {activeLesson.mediaType === 'video' ? (
                   <video src={activeLesson.mediaUrl} controls className="w-full max-h-[400px] object-cover" />
                 ) : (
                   <img src={activeLesson.mediaUrl} className="w-full max-h-[400px] object-cover" alt="Lesson context" />
                 )}
              </div>
            )}

            <div className="space-y-8">
              {activeLesson.sentences.map((sentence) => (
                <div key={sentence.id} className="group">
                  {/* Words Row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-4 mb-3 items-end">
                    {sentence.words.map((word, idx) => {
                      const hasJyutping = word.jyutping && word.jyutping.length > 0;
                      return (
                        <div key={idx} className="flex flex-col items-center text-center">
                          {hasJyutping && (
                            <span className="text-sm font-medium text-teal-600 mb-0.5">{word.selectedJyutping}</span>
                          )}
                          {!hasJyutping && (
                             <div className="h-5"></div>
                          )}
                          <span className="text-2xl text-gray-800 font-serif leading-none">{word.char}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Translation & Audio */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 group-hover:bg-teal-50 transition-colors">
                    <p className="text-gray-700 italic font-medium">{sentence.english}</p>
                    {sentence.audioBase64 && (
                      <button
                        // Use class to hide from PDF if needed, but here we keep structure simple
                        data-html2canvas-ignore="true" 
                        onClick={() => handlePlayAudio(sentence.audioBase64, sentence.id)}
                        className={`p-3 rounded-full shadow-sm transition-all ${playingSentenceId === sentence.id ? 'bg-teal-500 text-white ring-2 ring-teal-300' : 'bg-white text-teal-600 hover:bg-teal-100'}`}
                      >
                        {playingSentenceId === sentence.id ? <Pause size={20} fill="currentColor" /> : <Volume2 size={20} />}
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-gray-100 mt-8 w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-teal-700 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {student.name}</h1>
            <p className="opacity-90 text-sm">Your Cantonese Practice Dashboard</p>
          </div>
          <button onClick={onLogout} className="text-teal-100 hover:text-white underline text-sm">Switch User</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-teal-600"/> Assigned Lessons
        </h2>
        
        {student.assignedLessonIds.length === 0 ? (
           <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
             No lessons assigned yet. Ask your teacher to send you content!
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.assignedLessonIds.map(lid => {
              const lesson = getLessonById(lid);
              if (!lesson) return null;
              return (
                <button
                  key={lid}
                  onClick={() => setActiveLesson(lesson)}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all text-left border-l-4 border-teal-500 group"
                >
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-teal-700 mb-2">{lesson.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{lesson.sentences.length} Sentences</p>
                  <div className="flex items-center text-teal-600 text-sm font-medium">
                    Start Practicing <ArrowLeft size={16} className="rotate-180 ml-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;