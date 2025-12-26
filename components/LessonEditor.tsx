
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { generateCantoneseLesson } from '../services/geminiService';
import { Lesson, Sentence, AppMode } from '../types';
import AudioRecorder from './AudioRecorder';
import { ArrowLeft, Wand2, Save, Loader2, Printer, AlertCircle, RefreshCw, Clock } from 'lucide-react';

interface Props {
  onNavigate: (mode: AppMode) => void;
  editLesson?: Lesson;
}

const LessonEditor: React.FC<Props> = ({ onNavigate, editLesson }) => {
  const { addLesson, updateLesson } = useData();
  const [title, setTitle] = useState(editLesson?.title || '');
  const [inputText, setInputText] = useState('');
  const [mediaUrl, setMediaUrl] = useState(editLesson?.mediaUrl || '');
  const [sentences, setSentences] = useState<Sentence[]>(editLesson?.sentences || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(editLesson ? 2 : 1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  
  // Handle countdown for rate limits
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
    if (!inputText.trim() || retryCountdown > 0) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      const generatedSentences = await generateCantoneseLesson(inputText);
      setSentences(generatedSentences);
      setStep(2);
    } catch (error: any) {
      if (error.message === "QUOTA_EXHAUSTED") {
          setErrorMessage("AI 老师现在有点累（请求太频繁），请休息一下再试。");
          setRetryCountdown(60); // Set a 60s cooldown
      } else {
          setErrorMessage(error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSentence = (id: string, field: Partial<Sentence>) => {
    setSentences(prev => prev.map(s => s.id === id ? { ...s, ...field } : s));
  };

  const saveLesson = () => {
    if (!title.trim()) { alert("请输入课程标题"); return; }
    const lessonData: Lesson = {
      id: editLesson?.id || `lesson-${Date.now()}`,
      title,
      createdAt: editLesson?.createdAt || Date.now(),
      mediaUrl,
      mediaType: mediaUrl ? 'image' : undefined,
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

      {/* PRINTABLE HANDOUT (Hidden in web view) */}
      <div id="printable-handout" className="hidden">
          <div className="border-b-4 border-teal-600 pb-4 mb-8">
            <h1 className="text-4xl font-bold text-gray-900">{title || 'Cantonese Lesson'}</h1>
            <p className="text-teal-600 font-bold uppercase tracking-widest text-sm mt-1">Shadowing Handout • YuetYu Tutor</p>
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
                      <p className="text-xl italic text-gray-700 bg-gray-50 p-4 rounded-xl border-l-4 border-teal-400">{s.english}</p>
                  </div>
              ))}
          </div>
      </div>

      <div className="flex items-center gap-4 mb-6 no-print">
        <button onClick={() => onNavigate(AppMode.TEACHER_DASHBOARD)} className="text-gray-500 hover:text-gray-800 p-2"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-800">{editLesson ? '编辑课程' : '创建新课程'}</h1>
      </div>

      <div className="mb-6 no-print">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">标题</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 text-xl font-bold border rounded-xl outline-none focus:ring-2 focus:ring-teal-500" placeholder="例如：我的第一课"/>
      </div>

      {step === 1 ? (
        <div className="space-y-6 no-print">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl flex flex-col gap-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-bold">生成遇到问题</p>
                  <p className="text-xs mt-1 opacity-80">{errorMessage}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                 <button onClick={handleAIProcess} disabled={retryCountdown > 0 || isProcessing} className="bg-white/50 px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition flex items-center gap-2 disabled:opacity-50">
                   {retryCountdown > 0 ? <><Clock size={14}/> 冷却中 ({retryCountdown}s)</> : <><RefreshCw size={14}/> 立即重试</>}
                 </button>
              </div>
            </div>
          )}

          <div className="relative">
            <textarea 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              className="w-full h-80 p-5 border rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed text-lg" 
              placeholder="在这里粘贴粤语文本（建议每次输入不超过500字以获得最佳效果）..."
            />
            <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-mono">
              {inputText.length} 字
            </div>
          </div>

          <button 
            onClick={handleAIProcess} 
            disabled={isProcessing || !inputText.trim() || retryCountdown > 0} 
            className="w-full flex justify-center items-center gap-3 bg-teal-600 text-white py-5 rounded-2xl hover:bg-teal-700 font-bold text-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-teal-600/20"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" /> 正在分析文本，请稍候...</>
            ) : retryCountdown > 0 ? (
              <><Clock /> 频率限制，请等待 {retryCountdown} 秒</>
            ) : (
              <><Wand2 /> 开始 AI 智能分析</>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400">
            * AI 将自动完成句子分割、英文翻译以及粤语拼音标注。
          </p>
        </div>
      ) : (
        <div className="space-y-8 no-print">
          <div className="space-y-6">
            {sentences.map((sentence) => (
              <div key={sentence.id} className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-white hover:border-teal-200 transition-all group">
                <div className="flex flex-wrap gap-x-4 gap-y-6 mb-6 items-end">
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
                          className="text-[10px] text-teal-600 font-bold text-center w-14 mb-1 border-none focus:ring-0 p-0 bg-transparent"
                        />
                        <span className="text-2xl font-serif text-gray-800">{word.char}</span>
                    </div>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={sentence.english} 
                  onChange={(e) => updateSentence(sentence.id, { english: e.target.value })} 
                  className="w-full border-b pb-2 font-medium italic mb-4 outline-none focus:border-teal-500 text-gray-600" 
                  placeholder="英文翻译..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">老师录音</span>
                      <AudioRecorder existingAudio={sentence.audioBase64} onSave={(base64) => updateSentence(sentence.id, { audioBase64: base64 })} />
                    </div>
                    <div className="bg-orange-50/50 p-4 rounded-xl">
                      <textarea 
                        value={sentence.explanationText || ''} 
                        onChange={(e) => updateSentence(sentence.id, { explanationText: e.target.value })} 
                        className="w-full text-xs p-3 bg-white border border-orange-100 rounded-lg outline-none focus:ring-1 focus:ring-orange-200" 
                        placeholder="添加教学重点或备注..."
                      />
                    </div>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 flex gap-4 z-50">
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-4 bg-white border-2 border-teal-600 text-teal-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-2xl hover:bg-teal-50 transition-all"
              >
                <Printer size={20} /> 打印/导出 PDF
              </button>
              <button 
                onClick={saveLesson} 
                className="flex-1 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 font-bold flex items-center justify-center gap-2 shadow-2xl transition-all"
              >
                <Save size={20} /> 保存到本地
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
