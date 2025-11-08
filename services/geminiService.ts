import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { VideoScript, Segment } from '../types';
import { searchPexelsPhotos } from "./pexelsService";

if (!process.env.API_KEY) {
    // This is a placeholder check. In a real environment, the API key is expected to be set.
    // In this specific runtime, it's injected automatically.
    console.warn("API_KEY environment variable not found. Using a placeholder.");
}

// Create a new instance for each call to ensure the latest API key is used, especially for VEO.
// FIX: Removed fallback API key to strictly adhere to guidelines. The API key must be obtained exclusively from `process.env.API_KEY`.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });


export async function generateVideoScript(topic: string): Promise<VideoScript> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a short video script about "${topic}". Provide a catchy title and 5 segments. For each segment, provide a narration text and relevant search keywords for stock media.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { 
                        type: Type.STRING,
                        description: "A catchy title for the video."
                    },
                    segments: {
                        type: Type.ARRAY,
                        description: "An array of video segments, ideally 5 segments.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                narration_text: { 
                                    type: Type.STRING,
                                    description: "The narration text or on-screen text for this segment."
                                },
                                search_keywords_for_media: { 
                                    type: Type.STRING,
                                    description: "A short, comma-separated list of keywords to find stock photos or videos for this segment."
                                }
                            },
                            required: ["narration_text", "search_keywords_for_media"]
                        }
                    }
                },
                required: ["title", "segments"]
            }
        }
    });

    // FIX: The `response.text` is a property, not a function.
    const parsedResponse: { title: string; segments: Omit<Segment, 'id' | 'mediaUrl' | 'mediaType'>[] } = JSON.parse(response.text);

    // Fetch initial media for all segments from Pexels
    const segmentsWithMediaPromises = parsedResponse.segments.map(async (segment, index) => {
        let mediaUrl = `https://picsum.photos/seed/${encodeURIComponent(segment.search_keywords_for_media.split(',')[0].trim())}/1280/720`;
        let mediaType: 'image' | 'video' = 'image';
        
        try {
            const photoResults = await searchPexelsPhotos(segment.search_keywords_for_media.split(',')[0].trim());
            if (photoResults.length > 0) {
                mediaUrl = photoResults[0].src.large2x;
            }
        } catch (e) {
            console.warn("Failed to fetch initial media from Pexels, using placeholder.", e)
        }
        
        return {
            ...segment,
            id: `segment-${Date.now()}-${index}`,
            mediaUrl,
            mediaType,
            transition: 'fade' as const
        };
    });

    const segmentsWithMedia = await Promise.all(segmentsWithMediaPromises);

    // Add unique IDs and generate media URLs for each segment
    const processedScript: VideoScript = {
        ...parsedResponse,
        segments: segmentsWithMedia,
    };

    return processedScript;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to fetch video script from Gemini API.');
  }
}

export async function suggestMediaKeywords(narrationText: string): Promise<string> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following narration text for a video segment, suggest 5 to 7 diverse and visually descriptive keywords for finding stock photos or videos. Provide only a comma-separated list of the keywords. Do not add any other text or explanation.\n\nNarration: "${narrationText}"`,
      config: {
        temperature: 0.7,
      }
    });

    // FIX: The `response.text` is a property, not a function.
    return response.text.trim().replace(/"/g, '');

  } catch (error) {
    console.error('Error calling Gemini API for keyword suggestion:', error);
    throw new Error('Failed to suggest media keywords from Gemini API.');
  }
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error('Error generating image:', error);
        throw new Error('Failed to generate image from prompt.');
    }
}

export async function editImageFromPrompt(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: { data: base64ImageData, mimeType: mimeType },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const imageMimeType = part.inlineData.mimeType;
                return `data:${imageMimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error('No image was generated by the model.');
    } catch (error) {
        console.error('Error editing image:', error);
        throw new Error('Failed to edit image from prompt.');
    }
}

export async function generateVideoFromPrompt(prompt: string, aspectRatio: '16:9' | '9:16') {
    const ai = getAI();
    try {
        const operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio,
            }
        });
        return operation;
    } catch (error) {
        console.error('Error generating video:', error);
        throw error;
    }
}

// FIX: Update getVideosOperation to accept a request object for clarity.
export async function getVideosOperation(request: { operation: any }) {
    const ai = getAI();
    return await ai.operations.getVideosOperation(request);
}

export async function generateSpeechFromText(text: string): Promise<string> {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this narration clearly: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error('Error generating speech:', error);
        throw new Error('Failed to generate speech from text.');
    }
}