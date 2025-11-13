// A simple Pexels API client.
// In a real app, you would want to use a more robust client library.
import { AspectRatio } from '../types';

const PEXELS_API_KEY = 'VqsQCdnyW5XkDMidGkbnjDsGJXPyqHsNwxWU9r0NPkU48x2XnTqwWo8l';
const PEXELS_API_BASE = 'https://api.pexels.com';

interface PexelsPhoto {
  id: number;
  src: {
    large2x: string;
    large: string;
    medium: string;
    original: string;
    portrait: string;
  };
}

interface PexelsVideo {
    id: number;
    image: string; // poster image
    video_files: {
        id: number;
        quality: 'hd' | 'sd';
        link: string;
    }[];
}

interface PexelsImageSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

interface PexelsVideoSearchResponse {
    videos: PexelsVideo[];
    total_results: number;
}

type PexelsOrientation = 'landscape' | 'portrait' | 'square';

const mapAspectRatioToOrientation = (aspectRatio: AspectRatio): PexelsOrientation => {
    switch (aspectRatio) {
        case '16:9':
        case '4:3':
            return 'landscape';
        case '9:16':
        case '3:4':
            return 'portrait';
        case '1:1':
            return 'square';
        default:
            return 'landscape';
    }
};


const fetchFromPexels = async <T>(endpoint: string): Promise<T> => {
    if (!PEXELS_API_KEY) {
        throw new Error("Pexels API key is not configured. Please set the PEXELS_API_KEY environment variable.");
    }

    const response = await fetch(`${PEXELS_API_BASE}${endpoint}`, {
        headers: {
            Authorization: PEXELS_API_KEY,
        },
    });

    if (!response.ok) {
        throw new Error(`Pexels API request failed: ${response.statusText}`);
    }

    return response.json();
}

export const fetchRealImage = async (query: string, aspectRatio: AspectRatio): Promise<string> => {
    const orientation = mapAspectRatioToOrientation(aspectRatio);
    const endpoint = `/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=${orientation}`;
    const data = await fetchFromPexels<PexelsImageSearchResponse>(endpoint);

    if (data.total_results === 0 || data.photos.length === 0) {
        throw new Error(`No real images found for "${query}"`);
    }
    
    // Return a random image from the results
    const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
    return randomPhoto.src.large;
};

export const fetchRealVideo = async (query: string, aspectRatio: AspectRatio): Promise<string> => {
    const orientation = mapAspectRatioToOrientation(aspectRatio);
    const endpoint = `/v1/videos/search?query=${encodeURIComponent(query)}&per_page=15&orientation=${orientation}`;
    const data = await fetchFromPexels<PexelsVideoSearchResponse>(endpoint);

    if (data.total_results === 0 || data.videos.length === 0) {
        throw new Error(`No real videos found for "${query}"`);
    }

    const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)];
    // Find the HD quality video file if available, otherwise take the first one
    const videoFile = randomVideo.video_files.find(f => f.quality === 'hd') || randomVideo.video_files[0];
    
    return videoFile.link;
};