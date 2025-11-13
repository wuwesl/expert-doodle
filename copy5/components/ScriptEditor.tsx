import React from 'react';
import { Segment, MediaType, AspectRatio } from '../types';
import SegmentItem from './SegmentItem';
import { RectangleHorizontal, RectangleVertical, Ratio } from 'lucide-react';

interface ScriptEditorProps {
  segments: Segment[];
  onGenerateMedia: (id: string, mediaType: MediaType) => void;
  onPromptChange: (id: string, newPrompt: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ segments, onGenerateMedia, onPromptChange, aspectRatio, onAspectRatioChange }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight">Script Editor</h2>
        <p className="text-brand-text-secondary mt-2 max-w-2xl mx-auto">
          Here's your transcribed audio, broken into segments. Edit the visual prompts and generate media for each part of your video.
        </p>
      </div>

      <div className="mb-10">
        <div className="bg-brand-surface p-4 rounded-lg max-w-lg mx-auto border border-white/10">
            <label className="block text-sm font-medium text-brand-text-main mb-3 text-center flex items-center justify-center gap-2">
              <Ratio size={16} />
              Project Aspect Ratio
            </label>
            <div className="flex justify-center flex-wrap gap-2">
            <button 
                onClick={() => onAspectRatioChange('16:9')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    aspectRatio === '16:9' 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
            >
                <RectangleHorizontal size={16} />
                16:9 Landscape
            </button>
            <button 
                onClick={() => onAspectRatioChange('9:16')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    aspectRatio === '9:16' 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
            >
                <RectangleVertical size={16} />
                9:16 Portrait
            </button>
            </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {segments.map((segment) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            onGenerateMedia={onGenerateMedia}
            onPromptChange={onPromptChange}
            aspectRatio={aspectRatio}
          />
        ))}
      </div>
    </div>
  );
};

export default ScriptEditor;