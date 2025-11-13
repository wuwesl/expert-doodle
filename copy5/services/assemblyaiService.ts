import { GoogleGenAI, Type } from "@google/genai";
import { Segment } from '../types';
import { generatePromptForText as generateVisualPromptWithGemini } from './geminiService';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY is not set in environment variables.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

interface Word {
    text: string;
    start: number;
    end: number;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:*/*;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });


export const transcribeAudio = async (file: File, onProgress: (message: string) => void): Promise<Segment[]> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured. Please set the API_KEY environment variable.");
    }
    onProgress('Preparing audio for transcription...');
    const base64Audio = await fileToBase64(file);

    const audioPart = {
        inlineData: {
          mimeType: file.type,
          data: base64Audio,
        },
    };

    const textPart = {
        text: `You are an expert audio transcription service. 
               Transcribe the provided audio file and return a JSON array of word objects.
               Each object must have three properties: 'text' (the transcribed word), 'start' (the start time in seconds with 3 decimal places), and 'end' (the end time in seconds with 3 decimal places).
               Do not include any other text or formatting in your response. Just the JSON.`,
    };

    onProgress('Transcribing with Gemini...');

    // gemini-2.5-pro is a strong choice for multimodal tasks like this.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [audioPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        start: { type: Type.NUMBER },
                        end: { type: Type.NUMBER },
                    },
                    required: ["text", "start", "end"],
                }
            }
        },
    });
    
    let transcribedWords: Word[];
    try {
      transcribedWords = JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse transcription JSON:", response.text);
      throw new Error("The transcription service returned an invalid format.");
    }

    if (!transcribedWords || transcribedWords.length === 0) {
        throw new Error("Transcription returned no words. The audio might be silent or too short.");
    }
    
    onProgress('Segmenting script...');
    const MAX_WORDS_PER_SEGMENT = 25;
    const segmentsData: { start: number; end: number; text: string }[] = [];
    let currentWords: Word[] = [];

    for (const word of transcribedWords) {
        currentWords.push(word);
        const endsWithPunctuation = /[.?!]$/.test(word.text);

        if (endsWithPunctuation || currentWords.length >= MAX_WORDS_PER_SEGMENT) {
            const firstWord = currentWords[0];
            const lastWord = currentWords[currentWords.length - 1];
            segmentsData.push({
                start: firstWord.start, // Already in seconds from Gemini
                end: lastWord.end,
                text: currentWords.map(w => w.text).join(' '),
            });
            currentWords = [];
        }
    }

    // Handle any remaining words
    if (currentWords.length > 0) {
        const firstWord = currentWords[0];
        const lastWord = currentWords[currentWords.length - 1];
        segmentsData.push({
            start: firstWord.start,
            end: lastWord.end,
            text: currentWords.map(w => w.text).join(' '),
        });
    }
    
    if (segmentsData.length === 0) {
        throw new Error("Could not form any text segments from the transcription.");
    }

    onProgress('Generating visual prompts for script...');
    
    const segmentsWithPrompts: Segment[] = [];
    let promptsGenerated = 0;
    const totalSegments = segmentsData.length;

    // Process segments sequentially to avoid hitting API rate limits.
    for (const segment of segmentsData) {
        promptsGenerated++;
        onProgress(`Generating prompt ${promptsGenerated}/${totalSegments}...`);
        
        let prompt: string;
        try {
            // Use Gemini for prompt generation.
            prompt = await generateVisualPromptWithGemini(segment.text);
        } catch (geminiError) {
            console.error("Gemini prompt generation also failed, using a basic fallback.", geminiError);
            prompt = `A cinematic shot related to: ${segment.text}`;
        }

        const startSeconds = segment.start;
        const endSeconds = segment.end;
        
        segmentsWithPrompts.push({
            id: `seg${promptsGenerated}`,
            timestamp: {
                start: startSeconds,
                end: endSeconds,
            },
            duration: Math.max(0.1, endSeconds - startSeconds),
            text: segment.text,
            prompt: prompt,
        });
    }

    return segmentsWithPrompts;
};
