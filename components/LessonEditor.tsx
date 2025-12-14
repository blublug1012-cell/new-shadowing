import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateCantoneseLesson } from '../services/geminiService';
import { Lesson, Sentence, AppMode } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Image as ImageIcon, Youtube, MessageSquareText, Mic } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson; // If provided, we are editing
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  
  // Form State
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  
  // Media State
  const [mediaType, setMediaType] = useState<'image' | 'youtube'>(
    editLesson?.mediaType === 'youtube' ? 'youtube' : 'image'
  );
  const [mediaUrl, setMediaUrl] = useState(editLesson?.mediaUrl || '');
  const [youtubeInput, setYoutubeInput] = useState(editLesson?.mediaType === 'youtube' ? editLesson.mediaUrl : '');

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
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB limit check
         alert("Image is too large. Please use an image under 2MB to keep the data file small.");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Extract video ID and convert to embed URL
  const handleYoutubeChange = (url: string) => {
    setYoutubeInput(url);
    if (!url) {
      setMediaUrl('');
      return;
    }

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

  const saveLesson = () => {
    if (!title.trim()) {
      alert("Please enter a lesson title.");
      return;
    }
    
    const lessonData: Lesson = {
      id: editLesson?.id || `lesson-${Date.now()}`,
      title,
      createdAt: editLesson?.createdAt || Date.now(),
      mediaUrl: mediaUrl,
      mediaType: mediaUrl ? mediaType : undefined,
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
            <p className="text-xs text-gray-500 mb-2">The AI will analyze this text to generate Jyutping and translations. Audio recording happens in the next step.</p>
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
            <h3 className="text-sm font-bold text-gray-700 mb-3">Lesson Media (Optional)</h3>
            
            <div className="flex gap-4 mb-4">
               <button 
                 onClick={() => { setMediaType('image'); setMediaUrl(''); setYoutubeInput(''); }}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${mediaType === 'image' ? 'bg-teal-600 text-white shadow' : 'bg-white text-gray-600 border'}`}
               >
                 <ImageIcon size={16} /> Upload Image
               </button>
               <button 
                 onClick={() => { setMediaType('youtube'); setMediaUrl(''); }}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${mediaType === 'youtube' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-600 border'}`}
               >
                 <Youtube size={16} /> YouTube Video
               </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                {mediaType === 'image' ? (
                  <div className="space-y-2">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"/>
                    <p className="text-xs text-gray-400">Max size: 2MB. Larger images will bloat the data file.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={youtubeInput}
                      onChange={(e) => handleYoutubeChange(e.target.value)}
                      placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=...)"
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <p className="text-xs text-gray-400">Paste the full link. We will handle the embedding.</p>
                  </div>
                )}
              </div>

              {mediaUrl && (
                <div className="relative h-32 w-48 bg-black rounded-lg overflow-hidden shadow-md shrink-0 border border-gray-200">
                   {mediaType === 'youtube' ? (
                      <iframe src={mediaUrl} className="w-full h-full" title="Preview" frameBorder="0" allowFullScreen></iframe>
                   ) : (
                     <img src={mediaUrl} alt="Preview" className="h-full w-full object-cover" />
                   )}
                   <button 
                     onClick={() => { setMediaUrl(''); setYoutubeInput(''); }} 
                     className="absolute top-1 right-1 bg-gray-900/80 text-white p-1 rounded-full text-xs hover:bg-red-600 transition"
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
               <p className="text-sm text-gray-500">Record your own voice for students to follow.</p>
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
                          <div className="h-5"></div> /* Placeholder for alignment */
                        )}
                        <span className="text-xl font-serif text-gray-800">{word.char}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Translation Input */}
                <div className="mb-3">
                   <label className="text-xs text-gray-400 uppercase font-bold">English Translation</label>
                   <input
                      type="text"
                      value={sentence.english}
                      onChange={(e) => updateSentence(sentence.id, { english: e.target.value })}
                      className="w-full text-sm text-gray-600 border-b border-gray-200 focus:border-teal-500 outline-none pb-1"
                      placeholder="English translation"
                    />
                </div>

                {/* Main Audio Recording (Manual Only) */}
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                            <Mic size={14}/> Reading Recording
                        </span>
                        
                        {/* Audio Controls */}
                        <div className="flex items-center gap-2">
                            <AudioRecorder 
                                existingAudio={sentence.audioBase64} 
                                onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} 
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                        Click the microphone to record your own pronunciation.
                    </p>
                </div>

                {/* Explanation Section */}
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquareText size={16} className="text-orange-600"/>
                        <span className="text-xs font-bold text-orange-800 uppercase">Vocabulary & Explanation (Optional)</span>
                    </div>
                    
                    <textarea
                        value={sentence.explanationText || ''}
                        onChange={(e) => updateSentence(sentence.id, { explanationText: e.target.value })}
                        className="w-full text-sm p-2 bg-white border border-orange-200 rounded text-gray-700 outline-none focus:ring-1 focus:ring-orange-400 mb-2 resize-y min-h-[60px]"
                        placeholder="Explain difficult words or grammar here (press Enter for new lines)..."
                    />
                    
                    <div className="flex items-center justify-between border-t border-orange-100 pt-2">
                         <span className="text-xs text-orange-600">Explanation Audio</span>
                         <AudioRecorder 
                            existingAudio={sentence.explanationAudio} 
                            onSave={(base64) => updateSentence(sentence.id, { explanationAudio: base64 })} 
                         />
                    </div>
                </div>

              </div>
            ))}
          </div>

          <div className="sticky bottom-4 bg-white p-4 shadow-lg rounded-xl border border-gray-200 flex justify-end gap-4 z-50">
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