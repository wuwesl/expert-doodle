import React, { useRef, useEffect } from 'react';
import { Segment, MediaType, AspectRatio } from '../types';
import { Bot, Image as ImageIcon } from 'lucide-react';

interface SegmentItemProps {
  segment: Segment;
  onGenerateMedia: (id: string, mediaType: MediaType) => void;
  onPromptChange: (id: string, newPrompt: string) => void;
  aspectRatio: AspectRatio;
}

const SegmentItem: React.FC<SegmentItemProps> = ({ segment, onGenerateMedia, onPromptChange, aspectRatio }) => {
  const isVideo = segment.mediaType === MediaType.REAL_FOOTAGE || segment.mediaType === MediaType.GENERATIVE_FOOTAGE;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !isVideo || !segment.duration) {
      return;
    }

    const playVideo = () => {
      videoElement.play().catch(error => {
        console.warn(`Autoplay for video ${segment.mediaUrl} was prevented:`, error.name);
      });
    };

    const handleCanPlay = () => playVideo();
    videoElement.addEventListener('canplay', handleCanPlay);

    const handleTimeUpdate = () => {
      if (videoElement.currentTime >= segment.duration) {
        videoElement.currentTime = 0;
        playVideo();
      }
    };
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    
    if (videoElement.readyState >= 3) {
        playVideo();
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [segment.mediaUrl, isVideo, segment.duration]);

  return (
    <div className="bg-brand-surface p-6 rounded-lg shadow-md transition-all hover:shadow-lg border border-white/10">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left side: Script and Prompt */}
        <div className="flex-1">
          <div className="mb-4">
            <p className="text-sm text-brand-text-secondary font-mono">
              [{segment.timestamp.start.toFixed(1)}s - {segment.timestamp.end.toFixed(1)}s] ({segment.duration.toFixed(1)}s)
            </p>
            <p className="text-brand-text-main italic text-lg mt-1">"{segment.text}"</p>
          </div>
          <div className="mb-4">
            <label htmlFor={`prompt-${segment.id}`} className="block text-sm font-medium text-brand-text-secondary mb-1">
              Visual Prompt
            </label>
            <textarea
              id={`prompt-${segment.id}`}
              value={segment.prompt}
              onChange={(e) => onPromptChange(segment.id, e.target.value)}
              className="w-full p-2 bg-brand-bg border border-gray-600 rounded-md focus:ring-brand-primary focus:border-brand-primary transition"
              rows={3}
              disabled={segment.isGenerating}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <p className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider text-center flex items-center justify-center gap-1.5"><Bot size={14}/> Generative AI</p>
                <div className="flex gap-2">
                     <button
                        onClick={() => onGenerateMedia(segment.id, MediaType.GENERATIVE_IMAGE)}
                        disabled={segment.isGenerating}
                        className="w-full px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Image
                    </button>
                    <button
                        onClick={() => onGenerateMedia(segment.id, MediaType.GENERATIVE_FOOTAGE)}
                        disabled={segment.isGenerating}
                        className="w-full px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Footage
                    </button>
                </div>
            </div>
             <div className="space-y-2">
                <p className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider text-center flex items-center justify-center gap-1.5"><ImageIcon size={14}/> Stock Media</p>
                <div className="flex gap-2">
                     <button
                        onClick={() => onGenerateMedia(segment.id, MediaType.REAL_IMAGE)}
                        disabled={segment.isGenerating}
                        className="w-full px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Image
                    </button>
                    <button
                        onClick={() => onGenerateMedia(segment.id, MediaType.REAL_FOOTAGE)}
                        disabled={segment.isGenerating}
                        className="w-full px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Footage
                    </button>
                </div>
            </div>
          </div>
        </div>
        
        {/* Right side: Media Preview */}
        <div className={`w-full md:w-80 flex-shrink-0 flex items-center justify-center bg-brand-bg rounded-md overflow-hidden ${
            aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
          }`}>
          {segment.isGenerating ? (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
              <p className="mt-2 text-sm text-brand-text-secondary">{segment.generationStatus || 'Generating...'}</p>
            </div>
          ) : segment.error ? (
            <div className="p-4 text-center text-red-400">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{segment.error}</p>
            </div>
          ) : segment.mediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={segment.mediaUrl}
                src={segment.mediaUrl}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={segment.mediaUrl} alt={segment.prompt} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="text-center text-brand-text-secondary p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm">Media will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SegmentItem;