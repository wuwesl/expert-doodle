import React, { useState, useRef, useCallback } from 'react';
import { Segment } from '../types';
import { transcribeAudio } from '../services/assemblyaiService';
import { UploadCloud } from 'lucide-react';

interface AudioUploadProps {
  onTranscriptionComplete: (segments: Segment[], audioFile: File) => void;
}

const AudioUpload: React.FC<AudioUploadProps> = ({ onTranscriptionComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProcessingMessage('Starting process...');

    try {
      const segments = await transcribeAudio(file, (message) => {
        setProcessingMessage(message);
      });
      onTranscriptionComplete(segments, file);
    } catch (err) {
      console.error('Transcription process failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during transcription.';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [onTranscriptionComplete]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // By resetting the input value, we allow the onChange event to fire
    // even if the user selects the same file again.
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      processFile(file);
    } else {
      setError("Please drop a valid audio file.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-center p-8 bg-brand-surface rounded-lg shadow-lg border border-white/10">
      <h2 className="text-4xl font-bold mb-2 text-brand-text-main tracking-tight">Start with an Audio File</h2>
      <p className="text-brand-text-secondary mb-8">
        Transform your audio into engaging videos effortlessly.
      </p>
      
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-600 hover:border-gray-500'} ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        {isProcessing ? (
            <>
              <svg className="animate-spin h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-lg font-semibold text-brand-text-main">{processingMessage}</p>
            </>
        ) : (
            <>
                <UploadCloud className="w-16 h-16 text-brand-text-secondary mb-4" />
                <p className="text-lg font-semibold text-brand-text-main">Drag & Drop Your Audio File Here</p>
                <p className="text-brand-text-secondary">or click to browse</p>
                <button
                    type="button"
                    className="mt-4 px-5 py-2.5 text-sm font-medium text-white bg-brand-primary hover:bg-blue-700 rounded-lg"
                    onClick={(e) => {
                        // We stop propagation to prevent the parent div's onClick from also
                        // firing, which would trigger the file input's click method twice.
                        e.stopPropagation();
                        fileInputRef.current?.click();
                    }}
                >
                    Browse Files
                </button>
            </>
        )}
        <input
          ref={fileInputRef}
          id="audio-upload"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </div>
      <p className="text-xs text-brand-text-secondary mt-4">Supports: MP3, WAV, M4A. Max file size: 100MB</p>

      {error && <p className="text-red-400 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">{error}</p>}
    </div>
  );
};

export default AudioUpload;