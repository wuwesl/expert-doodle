export enum AppState {
  UPLOAD = 'UPLOAD',
  EDITOR = 'EDITOR',
  EXPORT = 'EXPORT',
}

export enum MediaType {
  GENERATIVE_IMAGE = 'GENERATIVE_IMAGE',
  GENERATIVE_FOOTAGE = 'GENERATIVE_FOOTAGE',
  REAL_IMAGE = 'REAL_IMAGE',
  REAL_FOOTAGE = 'REAL_FOOTAGE',
}

export interface Segment {
  id: string;
  timestamp: {
    start: number;
    end: number;
  };
  duration: number;
  text: string;
  prompt: string;
  isGenerating?: boolean;
  generationStatus?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  error?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';