import React, { useState, useEffect } from 'react';
import { Segment, AspectRatio } from '../types';
import { X, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { exportWithWebCodecs } from '../services/webcodecsService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: Segment[];
  audioUrl: string | null;
  aspectRatio: AspectRatio;
}

type RenderStatus = 'idle' | 'rendering' | 'complete' | 'error';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, segments, audioUrl, aspectRatio }) => {
  const [status, setStatus] = useState<RenderStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing...');
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (isOpen && status === 'idle') {
      const startExport = async () => {
        if (!audioUrl) {
          setError("Audio file is missing, cannot export.");
          setStatus('error');
          return;
        }

        setStatus('rendering');
        setError(null);
        setResultBlob(null);

        try {
          const blob = await exportWithWebCodecs(
            segments,
            audioUrl,
            (message, percent) => {
              setStatusMessage(message);
              setProgress(percent);
            },
            aspectRatio
          );
          setResultBlob(blob);
          setStatus('complete');
          setStatusMessage('Your video is ready!');
        } catch (err) {
          console.error("WebCodecs export failed:", err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during export.';
          setError(errorMessage);
          setStatus('error');
        }
      };
      
      startExport();

    } else if (!isOpen) {
       // Reset state after a short delay to allow for closing animation
       setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setError(null);
        setResultBlob(null);
      }, 300);
    }
  }, [isOpen, status, segments, audioUrl, aspectRatio]);

  const handleDownload = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-md p-6 relative animate-fade-in border border-white/10">
        <button onClick={onClose} disabled={status === 'rendering'} className="absolute top-3 right-3 text-brand-text-secondary hover:text-brand-text-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-center mb-6">
          {status === 'complete' ? 'Render Complete' : status === 'error' ? 'Export Failed' : 'Exporting Video'}
        </h2>
        
        {status === 'rendering' && (
          <>
            <div className="w-full bg-brand-bg rounded-full h-2.5 mb-2">
              <div
                className="bg-brand-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-brand-text-secondary mt-2">
              <span className="truncate pr-4">{statusMessage}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
          </>
        )}
        
        {status === 'complete' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-brand-text-secondary mb-6">
              Your video has been successfully rendered in your browser.
            </p>
            <button
              onClick={handleDownload}
              className="w-full px-8 py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-opacity inline-flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download MP4
            </button>
          </div>
        )}

        {status === 'error' && (
            <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-brand-text-secondary mb-2">Something went wrong during the export process.</p>
                <p className="text-sm bg-brand-bg p-3 rounded-md text-red-400 font-mono break-words">{error}</p>
                <button
                    onClick={onClose}
                    className="w-full mt-4 px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                >
                    Close
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;