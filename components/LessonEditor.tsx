
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateLessonContent } from '../services/geminiService';
import { Lesson, Sentence, AppMode, Word } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Printer, AlertCircle, RefreshCw, Clock, Edit3, Sparkles, Languages, Type as TypeIcon, Check, X } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson;
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'cantonese' | 'mandarin'>('cantonese');
  const [sentences, setSentences] = useState<Sentence[]>(editLesson?.sentences || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(editLesson ? 2 : 1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  
  // Bulk Edit State
  const [bulkEditId, setBulkEditId] = useState<string | null>(null);
  const [bulkEditText, setBulkEditText] = useState('');

  useEffect(() => {
    let timer: any;
    if (retryCountdown > 0) {
      timer = setInterval(() => {
        setRetryCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleAIProcess = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const generatedSentences = await generateLessonContent(inputText, mode);
      setSentences(generatedSentences);
      setStep(2);
    } catch (error: any) {
      if (error.message === "QUOTA_EXHAUSTED") {
          setErrorMessage("API 额度暂满：免费版 Gemini 每分钟请求次数有限。");
          setRetryCountdown(50);
      } else {
          setErrorMessage(error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualProcess = () => {
    if (!inputText.trim()) return;
    
    const splitRegex = /([。！？；\n!?;])/;
    const parts = inputText.split(splitRegex);
    const manualSentences: Sentence[] = [];
    
    let currentSentence = "";
    for (let part of parts) {
        if (splitRegex.test(part)) {
            currentSentence += part;
            if (currentSentence.trim()) {
                manualSentences.push(createEmptySentence(currentSentence.trim()));
            }
            currentSentence = "";
        } else {
            currentSentence += part;
        }
    }
    
    if (currentSentence.trim()) {
        manualSentences.push(createEmptySentence(currentSentence.trim()));
    }

    setSentences(manualSentences);
    setStep(2);
  };

  const createEmptySentence = (text: string): Sentence => {
    const words: Word[] = text.split('').map(char => ({
        char,
        jyutping: [],
        selectedJyutping: ''
    }));
    
    return {
        id: `sent-manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        english: '',
        words
    };
  };

  const updateSentence = (id: string, field: Partial<Sentence>) => {
    setSentences(prev => prev.map(s => s.id === id ? { ...s, ...field } : s));
  };

  const openBulkEdit = (sentence: Sentence) => {
    setBulkEditId(sentence.id);
    const currentPhonetics = sentence.words
      .filter(w => /[\u4e00-\u9fa5]/.test(w.char))
      .map(w => w.selectedJyutping)
      .join(' ');
    setBulkEditText(currentPhonetics);
  };

  const applyBulkEdit = (id: string) => {
    const sentence = sentences.find(s => s.id === id);
    if (!sentence) return;

    const phonetics = bulkEditText.trim().split(/\s+/);
    let phoneticIdx = 0;
    
    const updatedWords = sentence.words.map(word => {
        // Only assign phonetics to Chinese characters
        if (/[\u4e00-\u9fa5]/.test(word.char)) {
            const val = phonetics[phoneticIdx] || '';
            phoneticIdx++;
            return { ...word, selectedJyutping: val };
        }
        return word;
    });

    updateSentence(id, { words: updatedWords });
    setBulkEditId(null);
  };

  const saveLesson = () => {
    if (!title.trim()) { alert("请输入课程标题"); return; }
    const lessonData: Lesson = {
      id: editLesson?.id || `lesson-${Date.now()}`,
      title,
      createdAt: editLesson?.createdAt || Date.now(),
      sentences
    };
    if (editLesson) updateLesson(lessonData);
    else addLesson(lessonData);
    onNavigate(AppMode.TEACHER_DASHBOARD);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen pb-24">
      <style>{`
        @media print {
            body * { visibility: hidden; }
            #printable-handout, #printable-handout * { visibility: visible; }
            #printable-handout { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 20px; }
            .no-print { display: none !important; }
        }
      `}</style>

      {/* PRINTABLE HANDOUT */}
      <div id="printable-handout" className="hidden">
          <div className="border-b-4 border-teal-600 pb-4 mb-8">
            <h1 className="text-4xl font-bold text-gray-900">{title || 'Lesson Handout'}</h1>
            <p className="text-teal-600 font-bold uppercase tracking-widest text-sm mt-1">YuetYu Tutor</p>
          </div>
          <div className="space-y-10">
              {sentences.map((s, idx) => (
                  <div key={idx} className="break-inside-avoid border-b pb-8">
                      <div className="flex flex-wrap gap-x-6 gap-y-6 mb-4 items-end">
                          {s.words.map((w, wi) => (
                              <div key={wi} className="flex flex-col items-center">
                                  <span className="text-base font-bold text-teal-600 mb-1">{w.selectedJyutping}</span>
                                  <span className="text-4xl font-serif text-gray-900">{w.char}</span>
                              </div>
                          ))}
                      </div>
                      <p className="text-xl italic text-gray-700 bg-gray-50 p-4 rounded-xl border-l-4 border-teal-400 mb-4">{s.english}</p>
                      {s.explanationText && (
                        <div className="p-5 bg-orange-50 rounded-xl text-sm border border-orange-100 flex gap-3 text-gray-800">
                           <div className="font-bold text-orange-600 shrink-0">Notes:</div>
                           <div className="whitespace-pre-wrap leading-relaxed">{s.explanationText}</div>
                        </div>
                      )}
                  </div>
              ))}
          </div>
      </div>

      <div className="flex items-center gap-4 mb-6 no-print">
        <button onClick={() => onNavigate(AppMode.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-gray-800 p-2"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-800">{editLesson ? '编辑课程' : '创建新课程'}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 no-print">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">课程标题</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 text-xl font-bold border rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm" placeholder="例如：旅行粤语入门"/>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">教学语言模式</label>
          <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
             <button onClick={() => setMode('cantonese')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'cantonese' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}><Languages size={18}/> 粤语 (Jyutping)</button>
             <button onClick={() => setMode('mandarin')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'mandarin' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}><TypeIcon size={18}/> 普通话 (Pinyin)</button>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-6 no-print animate-fade-in">
          {errorMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-3xl flex flex-col gap-4 animate-fade-in shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5 text-amber-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-bold">AI 识别遇到问题</p>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                 <button onClick={handleAIProcess} disabled={retryCountdown > 0 || isProcessing} className="bg-white border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition flex items-center gap-2 disabled:opacity-50"><Sparkles size={14}/> 再次尝试 AI 识别</button>
                 <button onClick={handleManualProcess} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition flex items-center gap-2 shadow-sm"><Edit3 size={14}/> 跳过 AI，手动分句</button>
              </div>
            </div>
          )}

          <div className="relative group">
            <textarea 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              className="w-full h-80 p-8 border-2 border-gray-100 rounded-[2.5rem] outline-none focus:border-teal-500 leading-relaxed text-lg shadow-inner transition-all bg-gray-50/30 group-hover:bg-white" 
              placeholder="在这里粘贴教学文本（可以包含中英文、标点符号）..."
            />
            <div className="absolute bottom-6 right-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-white/80 px-3 py-1 rounded-full border">
              {inputText.length} characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
                onClick={handleAIProcess} 
                disabled={isProcessing || !inputText.trim() || retryCountdown > 0} 
                className={`flex justify-center items-center gap-3 py-5 rounded-[2rem] font-bold text-lg transition-all active:scale-95 disabled:opacity-50 shadow-xl ${mode === 'cantonese' ? 'bg-teal-600 text-white shadow-teal-600/20' : 'bg-orange-600 text-white shadow-orange-600/20'}`}
            >
                {isProcessing ? <><Loader2 className="animate-spin" /> 正在深度分析文本...</> : <><Wand2 /> AI 智能识别 (粤拼/拼音)</>}
            </button>
            <button onClick={handleManualProcess} disabled={isProcessing || !inputText.trim()} className="flex justify-center items-center gap-3 bg-white border-2 border-gray-200 text-gray-600 py-5 rounded-[2rem] hover:border-gray-400 font-bold text-lg transition-all active:scale-95 disabled:opacity-50">
                <Edit3 size={20} /> 直接手动分句编辑
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-12 no-print animate-fade-in pb-20">
          <div className="space-y-8">
            {sentences.map((sentence) => (
              <div key={sentence.id} className="border border-gray-100 rounded-[2.5rem] p-8 shadow-sm bg-white hover:border-teal-200 transition-all relative">
                
                {/* Sentence Toolbar */}
                <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Sentence {sentences.indexOf(sentence) + 1}</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => openBulkEdit(sentence)} 
                            className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 flex items-center gap-1.5"
                        >
                            <Edit3 size={14}/> 整行编辑拼音
                        </button>
                        <button 
                            onClick={() => setSentences(prev => prev.filter(s => s.id !== sentence.id))}
                            className="p-1.5 text-gray-300 hover:text-red-500 rounded-full transition-colors"
                        >
                            <X size={16}/>
                        </button>
                    </div>
                </div>

                {/* Words Row with Character Display */}
                <div className="flex flex-wrap gap-x-4 gap-y-8 mb-8 items-end">
                  {sentence.words.map((word, wIdx) => (
                    <div key={wIdx} className="flex flex-col items-center">
                        <input 
                          type="text" 
                          value={word.selectedJyutping} 
                          onChange={(e) => {
                             const newWords = [...sentence.words];
                             newWords[wIdx].selectedJyutping = e.target.value;
                             updateSentence(sentence.id, { words: newWords });
                          }}
                          className={`text-xs font-black text-center w-14 mb-1 border-none focus:ring-0 p-0 bg-transparent placeholder-gray-200 ${mode === 'cantonese' ? 'text-teal-600' : 'text-orange-600'}`}
                          placeholder="..."
                        />
                        <span className="text-3xl font-serif text-gray-800">{word.char}</span>
                    </div>
                  ))}
                </div>

                {/* Bulk Edit Overlay */}
                {bulkEditId === sentence.id && (
                    <div className="absolute inset-0 z-10 bg-white/95 rounded-[2.5rem] flex flex-col p-8 animate-fade-in border-2 border-teal-500">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><Edit3 size={18} className="text-teal-600"/> 批量编辑拼音</h4>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">空格分隔每个字</p>
                        </div>
                        <textarea 
                            autoFocus
                            value={bulkEditText}
                            onChange={(e) => setBulkEditText(e.target.value)}
                            className="flex-1 p-6 border-2 border-teal-100 rounded-2xl outline-none focus:border-teal-500 font-mono text-lg leading-relaxed bg-teal-50/30"
                            placeholder="例如：nei5 hou2 ma3..."
                        />
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => applyBulkEdit(sentence.id)} className="flex-1 bg-teal-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 shadow-lg"><Check size={20}/> 应用修改</button>
                            <button onClick={() => setBulkEditId(null)} className="px-6 py-4 border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50">取消</button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="relative">
                        <input 
                          type="text" 
                          value={sentence.english} 
                          onChange={(e) => updateSentence(sentence.id, { english: e.target.value })} 
                          className="w-full bg-gray-50/50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-gray-200 italic text-gray-700 placeholder-gray-300" 
                          placeholder="输入英文翻译..."
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50/50 p-4 rounded-[1.5rem] flex justify-between items-center border border-gray-50">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">老师录音</span>
                          <AudioRecorder existingAudio={sentence.audioBase64} onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} />
                        </div>
                        <div className="bg-orange-50/30 p-4 rounded-[1.5rem] border border-orange-50">
                          <textarea 
                            value={sentence.explanationText || ''} 
                            onChange={(e) => updateSentence(sentence.id, { explanationText: e.target.value })} 
                            className="w-full text-xs p-3 bg-white border border-orange-100/50 rounded-xl outline-none focus:ring-2 focus:ring-orange-200 min-h-[60px]" 
                            placeholder="教学难点、词汇解析..."
                          />
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 flex gap-4 z-50">
              <button onClick={() => window.print()} className="flex-1 py-5 bg-white border-2 border-teal-600 text-teal-600 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-2xl hover:bg-teal-50 transition-all active:scale-95">
                <Printer size={22} /> 导出 PDF
              </button>
              <button onClick={saveLesson} className="flex-1 py-5 bg-teal-600 text-white rounded-[2rem] hover:bg-teal-700 font-bold flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95">
                <Save size={22} /> 保存课程
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
