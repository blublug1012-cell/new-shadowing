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
  
  // Refs for audio processing to boost volume
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceStreamRef = useRef<MediaStream | null>(null);

  // Sync state if prop changes (e.g. AI generates new audio)
  useEffect(() => {
    setAudioUrl(existingAudio || null);
  }, [existingAudio]);

  const startRecording = async () => {
    try {
      // 1. Get the raw microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceStreamRef.current = stream;

      // 2. Setup Web Audio API to process the audio (Boost volume)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // 2a. Add a Compressor (Standardizes volume, prevents distortion when we boost it)
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // 2b. Add a Gain Node (Volume Booster)
      const gainNode = audioContext.createGain();
      // Boost volume by 300% (3.0). Standard mics are usually too quiet compared to YouTube.
      gainNode.gain.value = 3.0; 

      // 2c. Connect the graph: Source -> Compressor -> Gain -> Destination
      const destination = audioContext.createMediaStreamDestination();
      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);

      // 3. Record from the PROCESSED stream (destination), not the raw stream
      mediaRecorderRef.current = new MediaRecorder(destination.stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
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
        
        // Cleanup Audio Context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        // Stop all tracks on the source stream to turn off the mic light
        if (sourceStreamRef.current) {
            sourceStreamRef.current.getTracks().forEach(track => track.stop());
            sourceStreamRef.current = null;
        }
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
      // Actual cleanup happens in onstop event above
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