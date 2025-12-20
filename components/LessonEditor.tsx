
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { generateCantoneseLesson } from '../services/geminiService';
import { Lesson, Sentence, AppMode } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Image as ImageIcon, Youtube, MessageSquareText, Mic, Printer, Lightbulb } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson;
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'youtube'>(editLesson?.mediaType === 'youtube' ? 'youtube' : 'image');
  const [mediaUrl, setMediaUrl] = useState(editLesson?.mediaUrl || '');
  const [youtubeInput, setYoutubeInput] = useState(editLesson?.mediaType === 'youtube' ? editLesson.mediaUrl : '');
  const [sentences, setSentences] = useState<Sentence[]>(editLesson?.sentences || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(editLesson ? 2 : 1);
  
  const handleAIProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const generatedSentences = await generateCantoneseLesson(inputText);
      setSentences(generatedSentences);
      setStep(2);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSentence = (id: string, field: Partial<Sentence>) => {
    setSentences(prev => prev.map(s => s.id === id ? { ...s, ...field } : s));
  };

  const handlePrint = () => {
      window.print();
  };

  const saveLesson = () => {
    if (!title.trim()) { alert("Please enter a title."); return; }
    const lessonData: Lesson = {
      id: editLesson?.id || `lesson-${Date.now()}`,
      title,
      createdAt: editLesson?.createdAt || Date.now(),
      mediaUrl,
      mediaType: mediaUrl ? mediaType : undefined,
      sentences
    };
    if (editLesson) updateLesson(lessonData);
    else addLesson(lessonData);
    onNavigate(AppMode.TEACHER_DASHBOARD);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen pb-24">
      {/* PRINT VIEW CSS */}
      <style>{`
        @media print {
            body * { visibility: hidden; }
            #printable-handout, #printable-handout * { visibility: visible; }
            #printable-handout { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 20px; }
            .no-print { display: none !important; }
            .handout-sentence { break-inside: avoid; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        }
      `}</style>

      {/* PRINTABLE HANDOUT */}
      <div id="printable-handout" className="hidden">
          <div className="border-b-4 border-teal-600 pb-4 mb-8">
            <h1 className="text-4xl font-bold text-gray-900">{title || 'Cantonese Lesson'}</h1>
            <p className="text-teal-600 font-bold uppercase tracking-widest text-sm mt-1">Student Study Sheet • YuetYu Tutor</p>
          </div>
          <div className="space-y-10">
              {sentences.map((s, idx) => (
                  <div key={idx} className="handout-sentence">
                      <div className="flex flex-wrap gap-x-6 gap-y-6 mb-4 items-end">
                          {s.words.map((w, wi) => (
                              <div key={wi} className="flex flex-col items-center">
                                  <span className="text-base font-bold text-teal-600 mb-1">{w.selectedJyutping}</span>
                                  <span className="text-4xl font-serif text-gray-900">{w.char}</span>
                              </div>
                          ))}
                      </div>
                      <p className="text-xl italic text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-teal-400">{s.english}</p>
                      {s.explanationText && (
                          <div className="mt-3 p-4 bg-orange-50 rounded-xl text-sm border border-orange-100">
                             <strong>Notes:</strong> {s.explanationText}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>

      <div className="flex items-center gap-4 mb-6 no-print">
        <button onClick={() => onNavigate(AppMode.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-gray-800 p-2"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-800">{editLesson ? 'Edit Lesson' : 'Create New Lesson'}</h1>
      </div>

      <div className="mb-6 no-print">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 text-xl font-bold border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" placeholder="Lesson Title"/>
      </div>

      {step === 1 ? (
        <div className="space-y-6 no-print">
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-64 p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed" placeholder="Paste Cantonese text here..."/>
          <button onClick={handleAIProcess} disabled={isProcessing || !inputText.trim()} className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white py-4 rounded-xl hover:bg-teal-700 font-bold text-lg">{isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}Generate with AI</button>
        </div>
      ) : (
        <div className="space-y-8 no-print">
          <div className="space-y-6">
            {sentences.map((sentence) => (
              <div key={sentence.id} className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-white hover:border-teal-200 transition-all">
                <div className="flex flex-wrap gap-x-4 gap-y-6 mb-6 items-end">
                  {sentence.words.map((word, wIdx) => (
                    <div key={wIdx} className="flex flex-col items-center">
                        <span className="text-xs text-teal-600 font-bold text-center w-16 mb-1">{word.selectedJyutping}</span>
                        <span className="text-2xl font-serif text-gray-800">{word.char}</span>
                    </div>
                  ))}
                </div>
                <input type="text" value={sentence.english} onChange={(e) => updateSentence(sentence.id, { english: e.target.value })} className="w-full border-b pb-1 font-medium italic mb-4 outline-none focus:border-teal-500" placeholder="English translation"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Recording</span><AudioRecorder existingAudio={sentence.audioBase64} onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} /></div>
                    <div className="bg-orange-50 p-4 rounded-xl"><textarea value={sentence.explanationText || ''} onChange={(e) => updateSentence(sentence.id, { explanationText: e.target.value })} className="w-full text-xs p-2 bg-white border rounded-lg" placeholder="Teacher Notes..."/></div>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 flex gap-4">
              <button onClick={handlePrint} className="flex-1 py-4 bg-white border-2 border-teal-600 text-teal-600 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl"><Printer size={18} /> Print Handout (PDF)</button>
              <button onClick={saveLesson} className="flex-1 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-bold flex items-center justify-center gap-2 shadow-xl"><Save size={18} /> Save Lesson</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
