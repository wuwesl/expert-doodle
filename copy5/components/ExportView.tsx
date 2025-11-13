import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Segment, MediaType, AspectRatio } from '../types';
import { Play, Pause, Volume2, VolumeX, Download, ArrowLeft, Film } from 'lucide-react';
import ExportModal from './ExportModal';

interface ExportViewProps {
  segments: Segment[];
  audioUrl: string | null;
  onBack: () => void;
  aspectRatio: AspectRatio;
}

const ExportView: React.FC<ExportViewProps> = ({ segments, audioUrl, onBack, aspectRatio }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const currentSegment = segments[currentSegmentIndex];
  const isCurrentSegmentVideo = currentSegment?.mediaType === MediaType.REAL_FOOTAGE || currentSegment?.mediaType === MediaType.GENERATIVE_FOOTAGE;

  // --- Core Player Logic ---
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audio.pause();
    }
  };
  
  const toggleMute = () => setIsMuted(prev => !prev);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentTime = audio.currentTime;
    const activeSegmentIndex = segments.findIndex(s => currentTime >= s.timestamp.start && currentTime < s.timestamp.end);
    
    if (activeSegmentIndex !== -1 && activeSegmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(activeSegmentIndex);
    }
  }, [segments, currentSegmentIndex]);


  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentSegmentVideo) return;

    if (isPlaying) {
      video.play().catch(e => console.warn("Video clip playback failed:", e));
    } else {
      video.pause();
    }
  }, [isPlaying, currentSegment]);

  const handleTimelineClick = (index: number) => {
    const audio = audioRef.current;
    const segment = segments[index];
    if (audio && segment) {
      audio.currentTime = segment.timestamp.start;
      setCurrentSegmentIndex(index);
    }
  };
  
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (container) {
      const activeChild = container.children[currentSegmentIndex] as HTMLElement;
      if (activeChild) {
        const containerRect = container.getBoundingClientRect();
        const childRect = activeChild.getBoundingClientRect();
        
        const scrollOffset =
          activeChild.offsetLeft -
          container.offsetLeft -
          (containerRect.width - childRect.width) / 2;
        
        container.scrollTo({
          left: scrollOffset,
          behavior: 'smooth',
        });
      }
    }
  }, [currentSegmentIndex]);

  // --- Render Logic ---
  if (segments.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Nothing to Export</h2>
        <p className="text-brand-text-secondary mt-2">Go back to the editor and generate some media first.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 text-sm font-medium bg-brand-surface hover:bg-white/10 rounded-md transition-colors flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Back to Editor
        </button>
      </div>
    );
  }

  return (
    <>
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        segments={segments}
        audioUrl={audioUrl}
        aspectRatio={aspectRatio}
      />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 relative">
          <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-brand-text-main transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/10">
            <ArrowLeft size={20} /> Back to Editor
          </button>
          <h2 className="text-4xl font-bold tracking-tight">Export Video</h2>
          <p className="text-brand-text-secondary mt-2">Review your final video sequence below.</p>
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            muted={isMuted}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if(audioRef.current) audioRef.current.currentTime = 0;
              setCurrentSegmentIndex(0);
            }}
            onTimeUpdate={handleTimeUpdate}
          />
        )}

        <div className={`relative bg-brand-bg rounded-lg overflow-hidden shadow-lg mb-6 group transition-all duration-300 border border-white/10 ${
            aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] w-full max-w-sm mx-auto'
          }`}>
          {currentSegment?.mediaUrl ? (
            isCurrentSegmentVideo ? (
              <video
                ref={videoRef}
                key={currentSegment.mediaUrl}
                src={currentSegment.mediaUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
              />
            ) : (
              <img key={currentSegment.id} src={currentSegment.mediaUrl} alt={currentSegment.prompt} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center"><p className="text-brand-text-secondary">Media not available</p></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <p className="font-semibold text-xl drop-shadow-md">{currentSegment?.text}</p>
          </div>
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer" onClick={togglePlayPause}>
            <div className="flex items-center space-x-4">
              <button className="bg-black/50 p-4 rounded-full text-white backdrop-blur-sm" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={40} /> : <Play size={40} className="ml-1"/>}
              </button>
            </div>
          </div>
          <button onClick={toggleMute} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity backdrop-blur-sm" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-brand-text-main">Timeline</h3>
          <div ref={timelineContainerRef} className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {segments.map((segment, index) => {
              const isVideo = segment.mediaType === MediaType.REAL_FOOTAGE || segment.mediaType === MediaType.GENERATIVE_FOOTAGE;
              return (
                <div
                  key={segment.id}
                  onClick={() => handleTimelineClick(index)}
                  className={`relative flex-shrink-0 w-40 aspect-video bg-brand-bg rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ring-2 ${
                    index === currentSegmentIndex ? 'ring-brand-primary shadow-lg' : 'ring-transparent hover:ring-brand-secondary/70'
                  }`}
                >
                  {segment.mediaUrl && (
                      isVideo ?
                      <video src={segment.mediaUrl} className="w-full h-full object-cover" muted playsInline/> :
                      <img src={segment.mediaUrl} alt={segment.prompt} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40"></div>
                  <span className="absolute bottom-1 right-1.5 text-white font-bold text-xs bg-black/50 px-1.5 py-0.5 rounded">
                    {segment.duration.toFixed(1)}s
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-center">
          <button onClick={() => setIsExportModalOpen(true)} className="px-8 py-3 text-lg font-semibold bg-brand-primary hover:bg-blue-700 text-white rounded-md transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-blue-500/50">
            <Film size={20} />
            Export to MP4
          </button>
        </div>
      </div>
    </>
  );
};

export default ExportView;