import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateCantoneseLesson } from '../services/geminiService';
import { Lesson, Sentence, AppMode } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Image as ImageIcon } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson; // If provided, we are editing
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  
  // Form State
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  const [mediaUrl, setMediaUrl] = useState(editLesson?.mediaUrl || '');
  const [sentences, setSentences] = useState<Sentence[]>(editLesson?.sentences || []);
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(editLesson ? 2 : 1);

  const handleAIProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const generatedSentences = await generateCantoneseLesson(inputText);
      setSentences(generatedSentences);
      setStep(2);
    } catch (error) {
      alert("Failed to process text. Please check your connection or try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const saveLesson = () => {
    if (!title.trim()) {
      alert("Please enter a lesson title.");
      return;
    }
    
    const lessonData: Lesson = {
      id: editLesson?.id || `lesson-${Date.now()}`,
      title,
      createdAt: editLesson?.createdAt || Date.now(),
      mediaUrl,
      mediaType: mediaUrl ? (mediaUrl.startsWith('data:video') ? 'video' : 'image') : undefined,
      sentences
    };

    if (editLesson) {
      updateLesson(lessonData);
    } else {
      addLesson(lessonData);
    }
    onNavigate(AppMode.TEACHER_DASHBOARD);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => onNavigate(AppMode.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{editLesson ? 'Edit Lesson' : 'Create New Lesson'}</h1>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
          placeholder="e.g., Ordering Dim Sum"
        />
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantonese Text Input</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              placeholder="Paste Cantonese text here (e.g., 'Hello! 大家好，今日好开心。')..."
            />
          </div>
          
          <button
            onClick={handleAIProcess}
            disabled={isProcessing || !inputText.trim()}
            className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Generate Jyutping & Translation
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          {/* Media Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> Lesson Media (Optional)
            </h3>
            <div className="flex gap-4 items-center">
              <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="text-sm text-gray-500" />
              {mediaUrl && (
                <div className="relative h-20 w-20 bg-gray-200 rounded overflow-hidden">
                   {mediaUrl.startsWith('data:video') ? (
                     <video src={mediaUrl} className="h-full w-full object-cover" />
                   ) : (
                     <img src={mediaUrl} alt="Preview" className="h-full w-full object-cover" />
                   )}
                   <button 
                     onClick={() => setMediaUrl('')} 
                     className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg text-xs"
                   >
                     ✕
                   </button>
                </div>
              )}
            </div>
          </div>

          {/* Sentences Editor */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold text-gray-800">Edit & Record</h2>
               <p className="text-sm text-gray-500">Record audio for each sentence.</p>
            </div>

            {sentences.map((sentence, sIdx) => (
              <div key={sentence.id} className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white hover:border-teal-300 transition-colors">
                
                {/* Character & Jyutping Row */}
                <div className="flex flex-wrap gap-2 mb-3 items-end">
                  {sentence.words.map((word, wIdx) => {
                    const hasJyutping = word.jyutping && word.jyutping.length > 0;
                    return (
                      <div key={wIdx} className="flex flex-col items-center">
                        {hasJyutping ? (
                          <select
                            value={word.selectedJyutping}
                            onChange={(e) => updateWordJyutping(sentence.id, wIdx, e.target.value)}
                            className="text-xs text-teal-600 font-medium bg-transparent border-none outline-none cursor-pointer hover:bg-teal-50 rounded mb-1"
                          >
                            {word.jyutping.map(jp => (
                              <option key={jp} value={jp}>{jp}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-5"></div> /* Placeholder for alignment if needed, or remove for compact */
                        )}
                        <span className="text-xl font-serif text-gray-800">{word.char}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Translation Input */}
                <input
                  type="text"
                  value={sentence.english}
                  onChange={(e) => updateSentence(sentence.id, { english: e.target.value })}
                  className="w-full text-sm text-gray-600 border-b border-gray-200 focus:border-teal-500 outline-none pb-1 mb-3"
                  placeholder="English translation"
                />

                {/* Recording Control */}
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Teacher Audio</span>
                  <AudioRecorder 
                    existingAudio={sentence.audioBase64} 
                    onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-4 bg-white p-4 shadow-lg rounded-xl border border-gray-200 flex justify-end gap-4">
             <button
               onClick={() => setStep(1)}
               className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
             >
               Back
             </button>
             <button
               onClick={saveLesson}
               className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center gap-2"
             >
               <Save size={18} /> Save Lesson
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;