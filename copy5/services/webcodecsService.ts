import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Segment, MediaType, AspectRatio } from '../types';

// The WebCodecs API types are available in the global scope in modern browsers
// and supported by recent versions of TypeScript's DOM library.

// FIX: Define WebCodecs types from the window object to satisfy TypeScript
// when the type definitions are not available in the project's tsconfig.
const VideoEncoder = (window as any).VideoEncoder;
const AudioEncoder = (window as any).AudioEncoder;
const VideoFrame = (window as any).VideoFrame;
const AudioData = (window as any).AudioData;

const FPS = 30;

// Helper to load a media element and wait for it to be ready for seeking
const loadMediaElement = (segment: Segment): Promise<HTMLVideoElement | HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const isVideo = segment.mediaType === MediaType.REAL_FOOTAGE || segment.mediaType === MediaType.GENERATIVE_FOOTAGE;
    const element = isVideo ? document.createElement('video') : document.createElement('img');
    
    element.crossOrigin = 'anonymous'; // Important for fetching from Pexels/other origins

    if (element instanceof HTMLVideoElement) {
        element.muted = true;
        element.preload = 'auto';
        element.onloadeddata = () => resolve(element);
        element.onerror = () => reject(new Error(`Failed to load video: ${segment.mediaUrl}`));
    } else {
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error(`Failed to load image: ${segment.mediaUrl}`));
    }
    
    element.src = segment.mediaUrl!;
  });
};

// Helper function to draw wrapped, centered text on a canvas for subtitles
const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, // Center X for the text
  y: number, // Center Y for the entire text block
  maxWidth: number,
  lineHeight: number
) => {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  // First, construct the lines of text based on maxWidth
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Calculate the total height of the text block to center it vertically
  const totalHeight = lines.length * lineHeight;
  // Start drawing from the top of the calculated block
  let currentY = y - (totalHeight / 2);

  // Set baseline to top for easier line-by-line rendering from a starting Y position
  ctx.textBaseline = 'top';

  // Draw each line of text
  for (const l of lines) {
    // We trim the line to remove any trailing space
    const trimmedLine = l.trim();
    if (trimmedLine) { // Don't draw empty lines
      ctx.strokeText(trimmedLine, x, currentY);
      ctx.fillText(trimmedLine, x, currentY);
      currentY += lineHeight;
    }
  }
};


export const exportWithWebCodecs = async (
  segments: Segment[],
  audioUrl: string,
  onProgress: (message: string, progress: number) => void,
  aspectRatio: AspectRatio,
): Promise<Blob> => {
    // FIX: Use defined constants to check for WebCodecs API support, resolving TypeScript errors.
    if (!VideoEncoder || !AudioEncoder) {
        throw new Error("Your browser does not support the WebCodecs API, which is required for video export.");
    }
    
    onProgress('Initializing rendering engine...', 1);

    const isPortrait = aspectRatio === '9:16';
    const WIDTH = isPortrait ? 720 : 1280;
    const HEIGHT = isPortrait ? 1280 : 720;
    
    const arrayBufferTarget = new ArrayBufferTarget();

    let muxer = new Muxer({
        target: arrayBufferTarget,
        video: {
            codec: 'avc',
            width: WIDTH,
            height: HEIGHT,
        },
        audio: {
            codec: 'aac',
            sampleRate: 44100,
            numberOfChannels: 1,
        },
        firstTimestampBehavior: 'offset'
    });

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error('VideoEncoder error:', e),
    });
    videoEncoder.configure({
        codec: 'avc1.42001f', // H.264 baseline
        width: WIDTH,
        height: HEIGHT,
        bitrate: isPortrait ? 1_800_000 : 2_000_000,
        framerate: FPS,
    });
    
    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error('AudioEncoder error:', e),
    });
    audioEncoder.configure({
        codec: 'mp4a.40.2', // AAC-LC
        sampleRate: 44100,
        numberOfChannels: 1,
        bitrate: 128_000, // 128 kbps
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // --- Audio Processing ---
    onProgress('Processing audio track...', 10);
    const audioCtx = new AudioContext({ sampleRate: 44100 });
    const response = await fetch(audioUrl);
    const audioArrayBuffer = await response.arrayBuffer();
    const decodedAudio = await audioCtx.decodeAudioData(audioArrayBuffer);

    // The audio track is constructed by stitching together the audio portions
    // corresponding to each video segment. This ensures perfect synchronization.
    const pcmData = decodedAudio.getChannelData(0);
    const sampleRate = decodedAudio.sampleRate;
    let audioTimestamp = 0; // in microseconds

    for (const segment of segments) {
        const startSample = Math.floor(segment.timestamp.start * sampleRate);
        const endSample = Math.floor(segment.timestamp.end * sampleRate);
        const segmentPcmData = pcmData.subarray(startSample, endSample);
        
        if (segmentPcmData.length === 0) continue;

        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: sampleRate,
            numberOfFrames: segmentPcmData.length,
            numberOfChannels: 1,
            timestamp: audioTimestamp,
            data: segmentPcmData,
        });
        
        audioEncoder.encode(audioData);
        audioTimestamp += audioData.duration;
        audioData.close(); // Release memory after encoding
    }


    // --- Video Processing ---
    let frameCounter = 0;

    for (const [index, segment] of segments.entries()) {
        const progressStart = 20 + 70 * (index / segments.length);
        onProgress(`Processing segment ${index + 1}/${segments.length}`, progressStart);
        
        const element = await loadMediaElement(segment);
        const numFramesInSegment = Math.round(segment.duration * FPS);
        
        for (let i = 0; i < numFramesInSegment; i++) {
            if (element instanceof HTMLVideoElement) {
                element.currentTime = (i / numFramesInSegment) * element.duration;
                await new Promise(r => {
                    const onSeeked = () => {
                        element.removeEventListener('seeked', onSeeked);
                        r(null);
                    };
                    element.addEventListener('seeked', onSeeked);
                });
            }
            
            const elemWidth = element instanceof HTMLVideoElement ? element.videoWidth : element.width;
            const elemHeight = element instanceof HTMLVideoElement ? element.videoHeight : element.height;

            const scale = Math.min(WIDTH / elemWidth, HEIGHT / elemHeight);
            const scaledWidth = elemWidth * scale;
            const scaledHeight = elemHeight * scale;
            const x = (WIDTH - scaledWidth) / 2;
            const y = (HEIGHT - scaledHeight) / 2;
            ctx.clearRect(0, 0, WIDTH, HEIGHT);
            ctx.drawImage(element, x, y, scaledWidth, scaledHeight);

            // --- Draw Subtitles ---
            const fontSize = isPortrait ? 52 : 42;
            const lineHeight = isPortrait ? 60 : 50;

            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';

            // Add a stroke for better readability
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2.5;

            // Call the updated function to draw subtitles centered on the screen.
            drawWrappedText(ctx, segment.text, WIDTH / 2, HEIGHT / 2, WIDTH * 0.9, lineHeight);

            const timestamp = (frameCounter * 1_000_000) / FPS;
            const frame = new VideoFrame(canvas, { timestamp });
            
            videoEncoder.encode(frame, { keyFrame: frameCounter % (FPS * 2) === 0 });
            frame.close();
            frameCounter++;
        }
        onProgress(`Segment ${index + 1} complete`, progressStart + (70 / segments.length));
    }

    // --- Finalization ---
    onProgress('Finalizing video...', 95);
    await videoEncoder.flush();
    await audioEncoder.flush();
    
    onProgress('Muxing MP4 file...', 99);
    muxer.finalize();
    
    const { buffer } = arrayBufferTarget; // Extract buffer after finalization
    
    onProgress('Export complete!', 100);
    return new Blob([buffer], { type: 'video/mp4' });
};