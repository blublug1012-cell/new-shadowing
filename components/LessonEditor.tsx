
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateCantoneseLesson } from '../services/geminiService';
import { Lesson, Sentence, AppMode } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Image as ImageIcon, Youtube, MessageSquareText, Mic, Printer, GraduationCap, Lightbulb } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson;
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'youtube'>(
    editLesson?.mediaType === 'youtube' ? 'youtube' : 'image'
  );
  const [mediaUrl, setMediaUrl] = useState(editLesson?.mediaUrl || '');
  const [youtubeInput, setYoutubeInput] = useState(editLesson?.mediaType === 'youtube' ? editLesson.mediaUrl : '');
  const [sentences, setSentences] = useState<Sentence[]>(editLesson?.sentences || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(editLesson ? 2 : 1);
  const [isPrinting, setIsPrinting] = useState(false);
  
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
         alert("Image is too large. Please use an image under 2MB.");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setMediaUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleYoutubeChange = (url: string) => {
    setYoutubeInput(url);
    if (!url) { setMediaUrl(''); return; }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      setMediaUrl(`https://www.youtube.com/embed/${match[2]}`);
    }
  };

  const updateSentence = (id: string, field: Partial<Sentence>) => {
    setSentences(prev => prev.map(s => s.id === id ? { ...s, ...field } : s));
  };

  const updateWordJyutping = (sentenceId: string, wordIndex: number, newJyutping: string) => {
    setSentences(prev => prev.map(s => {
      if (s.id !== sentenceId) return s;
      const newWords = [...s.words];
      newWords[wordIndex] = { ...newWords[wordIndex], selectedJyutping: newJyutping };
      return { ...s, words: newWords };
    }));
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
        window.print();
        setIsPrinting(false);
    }, 500);
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
      {/* HIDDEN PRINT AREA */}
      <div id="printable-editor-area" className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 overflow-y-auto">
          <div className="border-b-2 border-teal-600 pb-4 mb-8">
            <h1 className="text-4xl font-bold text-gray-900">{title || 'Untitled Lesson'}</h1>
            <p className="text-teal-600 font-bold uppercase tracking-widest text-sm mt-1">Student Handout • YuetYu Tutor</p>
          </div>
          <div className="space-y-12">
              {sentences.map((sentence, sIdx) => (
                  <div key={sIdx} className="break-inside-avoid pb-8 border-b border-gray-100 last:border-0">
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
                              <div><strong className="block mb-1 text-orange-900">Notes:</strong> {sentence.explanationText}</div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
          <div className="mt-12 text-center text-gray-400 text-xs border-t pt-4">Generated by YuetYu Tutor Cantonese Platform</div>
      </div>
      <style>{`
        @media print {
            body > *:not(#printable-editor-area) { display: none !important; }
            #printable-editor-area { display: block !important; position: static !important; }
        }
      `}</style>

      <div className="flex items-center gap-4 mb-6 print:hidden">
        <button onClick={() => onNavigate(AppMode.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-800">{editLesson ? 'Edit Lesson' : 'Create New Lesson'}</h1>
      </div>

      <div className="mb-6 print:hidden">
        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Lesson Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 text-lg font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g., Ordering Dim Sum"/>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in print:hidden">
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Cantonese Text Input</label>
            <p className="text-xs text-gray-400 mb-3">AI will analyze this to generate Jyutping and English.</p>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-48 p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none resize-none leading-relaxed" placeholder="Paste Cantonese text here..."/>
          </div>
          <button onClick={handleAIProcess} disabled={isProcessing || !inputText.trim()} className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white py-4 rounded-xl hover:bg-teal-700 transition shadow-lg disabled:opacity-50 font-bold text-lg">{isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}Generate Content with AI</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-fade-in print:hidden">
          {/* Media Section */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Lesson Media (Optional)</h3>
            <div className="flex gap-4 mb-4">
               <button onClick={() => { setMediaType('image'); setMediaUrl(''); setYoutubeInput(''); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${mediaType === 'image' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}><ImageIcon size={16} /> Image</button>
               <button onClick={() => { setMediaType('youtube'); setMediaUrl(''); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${mediaType === 'youtube' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}><Youtube size={16} /> YouTube</button>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full">{mediaType === 'image' ? <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"/> : <input type="text" value={youtubeInput} onChange={(e) => handleYoutubeChange(e.target.value)} placeholder="Paste YouTube Link" className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none"/>}</div>
              {mediaUrl && <div className="relative h-32 w-48 bg-black rounded-xl overflow-hidden shadow-md shrink-0 border border-gray-200">{mediaType === 'youtube' ? <iframe src={mediaUrl} className="w-full h-full" title="Preview" frameBorder="0"></iframe> : <img src={mediaUrl} alt="Preview" className="h-full w-full object-cover" />}<button onClick={() => { setMediaUrl(''); setYoutubeInput(''); }} className="absolute top-1 right-1 bg-gray-900/80 text-white p-1 rounded-full text-xs hover:bg-red-600 transition">✕</button></div>}
            </div>
          </div>

          {/* Sentences Editor */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2"><h2 className="text-xl font-black text-gray-800">Content & Recordings</h2></div>
            {sentences.map((sentence, sIdx) => (
              <div key={sentence.id} className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-white hover:border-teal-200 transition-all">
                <div className="flex flex-wrap gap-x-4 gap-y-6 mb-6 items-end">
                  {sentence.words.map((word, wIdx) => {
                    const hasJyutping = word.jyutping && word.jyutping.length > 0;
                    const listId = `jyutping-options-${sentence.id}-${wIdx}`;
                    return (
                      <div key={wIdx} className="flex flex-col items-center">
                        {hasJyutping ? <><input type="text" value={word.selectedJyutping} onChange={(e) => updateWordJyutping(sentence.id, wIdx, e.target.value)} list={listId} className="text-xs text-teal-600 font-bold bg-transparent border-b border-transparent hover:border-teal-300 focus:border-teal-500 outline-none text-center w-[4.5rem] mb-1 p-0 transition-colors"/><datalist id={listId}>{word.jyutping.map(jp => <option key={jp} value={jp} />)}</datalist></> : <div className="h-5"></div>}
                        <span className="text-2xl font-serif text-gray-800 leading-none">{word.char}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mb-4"><label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Translation</label><input type="text" value={sentence.english} onChange={(e) => updateSentence(sentence.id, { english: e.target.value })} className="w-full text-base text-gray-700 border-b border-gray-100 focus:border-teal-400 outline-none pb-1 font-medium italic" placeholder="English translation"/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mic size={14} className="text-red-400"/> Primary Audio</span><AudioRecorder existingAudio={sentence.audioBase64} onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} /></div></div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1"><MessageSquareText size={14}/> Teacher Notes</span><AudioRecorder existingAudio={sentence.explanationAudio} onSave={(base64) => updateSentence(sentence.id, { explanationAudio: base64 })} /></div><textarea value={sentence.explanationText || ''} onChange={(e) => updateSentence(sentence.id, { explanationText: e.target.value })} className="w-full text-xs p-2 bg-white border border-orange-100 rounded-lg text-gray-700 outline-none resize-y min-h-[40px]" placeholder="Grammar or vocab notes..."/></div>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
              <div className="bg-white/90 backdrop-blur-md p-4 shadow-2xl rounded-2xl border border-gray-100 flex justify-between items-center">
                 <button onClick={() => setStep(1)} className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold transition-all">Change Text</button>
                 <div className="flex gap-3">
                    <button onClick={handlePrint} className="px-6 py-3 bg-white border-2 border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 font-bold flex items-center gap-2 transition-all shadow-sm"><Printer size={18} /> Handout (PDF)</button>
                    <button onClick={saveLesson} className="px-8 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-black flex items-center gap-2 transition-all shadow-xl hover:scale-105 active:scale-95"><Save size={18} /> Save Lesson</button>
                 </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
