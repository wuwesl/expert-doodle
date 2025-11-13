import React, { useState, useCallback } from 'react';
import { Segment, MediaType, AppState, AspectRatio } from './types';
import Header from './components/Header';
import AudioUpload from './components/AudioUpload';
import ScriptEditor from './components/ScriptEditor';
import ExportView from './components/ExportView';
import { generateImage, generateVideo } from './services/geminiService';
import { fetchRealImage, fetchRealVideo } from './services/pexelsService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const handleTranscriptionComplete = (newSegments: Segment[], audioFile: File) => {
    setSegments(newSegments);
    // Create a URL for the audio file to be used in the export preview
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(audioFile));
    setAppState(AppState.EDITOR);
  };
  
  const handleReset = () => {
    setSegments([]);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAppState(AppState.UPLOAD);
  };

  const updateSegment = useCallback((id: string, updates: Partial<Segment>) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, ...updates } : seg));
  }, []);

  const handleGenerateMedia = useCallback(async (id: string, mediaType: MediaType) => {
    const segment = segments.find(s => s.id === id);
    if (!segment) return;

    updateSegment(id, { isGenerating: true, mediaType, error: undefined, generationStatus: 'Starting...' });

    try {
      let mediaUrl = '';
      switch(mediaType) {
        case MediaType.GENERATIVE_IMAGE:
          mediaUrl = await generateImage(segment.prompt, aspectRatio);
          break;
        case MediaType.GENERATIVE_FOOTAGE:
          const onProgress = (message: string) => {
            updateSegment(id, { generationStatus: message });
          };
          mediaUrl = await generateVideo(segment.prompt, aspectRatio, onProgress);
          break;
        case MediaType.REAL_IMAGE:
          mediaUrl = await fetchRealImage(segment.prompt, aspectRatio);
          break;
        case MediaType.REAL_FOOTAGE:
          mediaUrl = await fetchRealVideo(segment.prompt, aspectRatio);
          break;
        default:
          throw new Error("Unsupported media type");
      }
      
      updateSegment(id, { mediaUrl, isGenerating: false, generationStatus: undefined });
    } catch (error) {
      console.error('Error generating media:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      updateSegment(id, { isGenerating: false, generationStatus: undefined, error: errorMessage });
    }
  }, [segments, updateSegment, aspectRatio]);

  const handlePromptChange = useCallback((id: string, newPrompt: string) => {
    updateSegment(id, { prompt: newPrompt });
  }, [updateSegment]);

  const renderContent = () => {
    switch (appState) {
      case AppState.UPLOAD:
        return <AudioUpload onTranscriptionComplete={handleTranscriptionComplete} />;
      case AppState.EDITOR:
        return (
          <ScriptEditor 
            segments={segments} 
            onGenerateMedia={handleGenerateMedia}
            onPromptChange={handlePromptChange}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
          />
        );
      case AppState.EXPORT:
        return <ExportView 
                  segments={segments.filter(s => s.mediaUrl)} 
                  audioUrl={audioUrl} 
                  onBack={() => setAppState(AppState.EDITOR)}
                  aspectRatio={aspectRatio}
                />;
      default:
        return <AudioUpload onTranscriptionComplete={handleTranscriptionComplete} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <Header 
        onNewProject={handleReset}
        onExport={() => setAppState(AppState.EXPORT)}
        showExport={appState === AppState.EDITOR && segments.length > 0}
      />
      <main className="container mx-auto px-4 py-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;