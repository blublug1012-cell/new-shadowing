import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, RefreshCw, Pause } from 'lucide-react';

interface AudioRecorderProps {
  onSave: (base64Audio: string) => void;
  existingAudio?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave, existingAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio || null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sync state if prop changes (e.g. AI generates new audio)
  useEffect(() => {
    setAudioUrl(existingAudio || null);
  }, [existingAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          onSave(base64String);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      } else {
        audioPlayerRef.current.src = audioUrl;
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const pauseAudio = () => {
      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          setIsPlaying(false);
      }
  };

  const deleteAudio = () => {
    setAudioUrl(null);
    onSave(""); // Clear in parent
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {!audioUrl && !isRecording && (
        <button
          onClick={startRecording}
          className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          title="Start Recording"
        >
          <Mic size={20} />
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 animate-pulse transition-colors"
          title="Stop Recording"
        >
          <Square size={20} fill="currentColor" />
        </button>
      )}

      {audioUrl && (
        <>
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            className={`p-2 rounded-full ${isPlaying ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600 hover:bg-green-200'} transition-colors`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          
          <button
            onClick={deleteAudio}
            className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            title="Delete / Re-record"
          >
            <RefreshCw size={18} />
          </button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;