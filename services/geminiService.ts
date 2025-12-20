
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
import { Sentence, Word } from "../types";

// Helper to convert raw PCM to WAV so browsers can play it
// Gemini TTS returns 24kHz, 1 channel, 16-bit PCM by default
const addWavHeader = (pcmBase64: string): string => {
  try {
    const binaryString = atob(pcmBase64);
    const len = binaryString.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
      view[i] = binaryString.charCodeAt(i);
    }

    const numChannels = 1;
    const sampleRate = 24000;
    const bitsPerSample = 16;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = len;

    const header = new ArrayBuffer(44);
    const dv = new DataView(header);

    // RIFF chunk descriptor
    writeString(dv, 0, 'RIFF');
    dv.setUint32(4, 36 + dataSize, true);
    writeString(dv, 8, 'WAVE');

    // fmt sub-chunk
    writeString(dv, 12, 'fmt ');
    dv.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    dv.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    dv.setUint16(22, numChannels, true);
    dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, byteRate, true);
    dv.setUint16(32, blockAlign, true);
    dv.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(dv, 36, 'data');
    dv.setUint32(40, dataSize, true);

    // Concatenate header and data
    const wavBuffer = new Uint8Array(header.byteLength + dataSize);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(view, header.byteLength);

    // Convert back to base64
    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    const l = bytes.byteLength;
    for (let i = 0; i < l; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch (e) {
    console.error("Error creating WAV header:", e);
    throw new Error("Audio processing failed");
  }
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Initializing the Google GenAI client correctly with a named parameter.
// Uses process.env.API_KEY directly as required.
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key Error: 'process.env.API_KEY' is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateCantoneseLesson = async (text: string): Promise<Sentence[]> => {
  const ai = getAIClient();
  // Selected gemini-3-pro-preview for complex reasoning task (Cantonese linguistic analysis)
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Analyze the following Cantonese text, which may contain mixed English and punctuation.
    
    1. Break the text down into sentences.
    2. For each sentence, provide the English translation.
    3. Break the sentence down into strictly separated 'tokens'. 
       - A token is: A single Chinese character, OR a full English word (do not split letters), OR a punctuation mark.
       - Preserve all original punctuation.
    4. For each token:
       - If it is a Chinese character: Provide an array of contextually accurate Jyutping.
         * IMPORTANT: Handle polyphones correctly based on context. 
         * Example: '嘅' in '点解嘅' (question particle) is 'ge2', but '嘅' in '我嘅' (possessive) is 'ge3'.
       - If it is English or Punctuation: Return an empty array [] for jyutping.
       - 'selectedJyutping' should default to the first jyutping, or empty string if none.

    Text to analyze:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized Cantonese teacher. You handle code-switching (mixed English/Cantonese) perfectly. You represent English words as single units and preserve punctuation exactly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              english: { type: Type.STRING },
              words: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    char: { type: Type.STRING },
                    jyutping: { 
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    selectedJyutping: { type: Type.STRING }
                  },
                  required: ["char", "jyutping", "selectedJyutping"]
                }
              }
            },
            required: ["id", "english", "words"]
          }
        }
      }
    });

    // Extracting text output using the .text property (not a method).
    if (response.text) {
      const cleanText = response.text.trim();
      const data = JSON.parse(cleanText);
      return data.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `sent-${Date.now()}-${idx}`
      }));
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    throw new Error(error.message || "Unknown API Error");
  }

  throw new Error("No response from AI.");
};

export const generateCantoneseSpeech = async (text: string): Promise<string> => {
  if (!text || !text.trim()) {
    throw new Error("Text is empty");
  }

  const ai = getAIClient();
  // Using the dedicated text-to-speech model
  const model = "gemini-2.5-flash-preview-tts";

  try {
    console.log("[TTS Request] Generating speech for:", text.substring(0, 20) + "...");

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
        },
      },
    });

    // Search through all parts to find the audio (inlineData) part.
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (base64Audio) {
      return addWavHeader(base64Audio);
    }

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const textPart = candidate?.content?.parts?.[0]?.text;

    console.warn("[TTS Failure Debug]", { finishReason, textPart, candidate });

    if (textPart) {
      throw new Error(`Model returned text instead of audio: ${textPart.substring(0, 50)}...`);
    }

    if (finishReason) {
       throw new Error(`Generation stopped. Reason: ${finishReason}. (Check console for details)`);
    }

    throw new Error("No audio data returned from API (Empty response)");

  } catch (error: any) {
    console.error("TTS Error:", error);
    throw new Error(error.message || "Failed to generate speech");
  }
};
