import React, { useState, useRef } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

interface VoiceInputProps {
  onVoiceInput: (transcript: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onVoiceInput }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      alert('お使いのブラウザは音声認識に対応していません。Chrome、Edge、Safariをお試しください。');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onVoiceInput(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
      title={isRecording ? '録音を停止' : '音声入力を開始'}
    >
      {isRecording ? <Square size={20} /> : <Mic size={20} />}
    </button>
  );
};