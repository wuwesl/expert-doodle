// IMPORTANT: Replace with your actual Deepseek API key.
// You can get a key from https://platform.deepseek.com/
const DEEPSEEK_API_KEY = "sk-405590d7f9c4459e811d9b7b9fa02487";
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Generates a visual prompt for a given line of text using the Deepseek API.
 * @param text The line of script to generate a prompt for.
 * @returns A promise that resolves to a string containing the visual prompt.
 * @throws An error if the API call fails or returns an invalid response.
 */
export const generateVisualPrompt = async (text: string): Promise<string> => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("Deepseek API key is not configured. Please add your key to services/deepseekService.ts");
  }

  const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
              {
                  role: 'system',
                  content: 'You are an AI assistant that generates a short, one-sentence visual prompt for an AI image/video generator based on a line of script. The prompt should be descriptive and cinematic. Do not add any extra formatting or quotes around the prompt.'
              },
              {
                  role: 'user',
                  content: `Generate a prompt for this script line: "${text}"`
              }
          ],
          max_tokens: 100, // Generous limit for a single sentence
          temperature: 0.7,
          stream: false
      })
  });

  if (!response.ok) {
      const errorBody = await response.json();
      console.error("Deepseek API error:", errorBody);
      throw new Error(`Deepseek API request failed: ${errorBody.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const prompt = data.choices[0]?.message?.content?.trim();

  if (!prompt) {
    throw new Error("Deepseek returned an empty or invalid prompt.");
  }

  // Clean up any potential quotes the model might have added despite instructions
  return prompt.replace(/^["']|["']$/g, '');
};