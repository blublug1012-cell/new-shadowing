
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
import { Sentence, Word } from "../types";

// Helper to convert raw PCM to WAV so browsers can play it
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

    writeString(dv, 0, 'RIFF');
    dv.setUint32(4, 36 + dataSize, true);
    writeString(dv, 8, 'WAVE');
    writeString(dv, 12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, numChannels, true);
    dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, byteRate, true);
    dv.setUint16(32, blockAlign, true);
    dv.setUint16(34, bitsPerSample, true);
    writeString(dv, 36, 'data');
    dv.setUint32(40, dataSize, true);

    const wavBuffer = new Uint8Array(header.byteLength + dataSize);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(view, header.byteLength);

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

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key Error: 'process.env.API_KEY' is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateCantoneseLesson = async (text: string): Promise<Sentence[]> => {
  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  
  // Minimalist prompt to avoid filtering and reduce token overhead
  const prompt = `Task: Split Cantonese text into sentences with English translation and character-level Jyutping.
Text: "${text}"`;

  try {
    const apiPromise = ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a Cantonese linguist. Output ONLY valid JSON array of objects with schema: [{english:string, words:[{char:string, selectedJyutping:string}]}]",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              words: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    char: { type: Type.STRING },
                    selectedJyutping: { type: Type.STRING }
                  },
                  required: ["char", "selectedJyutping"]
                }
              }
            },
            required: ["english", "words"]
          }
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 35000)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]) as any;

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      return data.map((s: any, idx: number) => ({
        ...s,
        id: `sent-${Date.now()}-${idx}`
      }));
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message === "TIMEOUT") throw new Error("TIMEOUT");
    
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("QUOTA_EXHAUSTED");
    }
    throw new Error("AI 服务繁忙，请稍后再试或使用手动模式。");
  }

  throw new Error("AI 未返回内容");
};

export const generateCantoneseSpeech = async (text: string): Promise<string> => {
  if (!text || !text.trim()) throw new Error("Text is empty");

  const ai = getAIClient();
  const model = "gemini-2.5-flash-preview-tts";

  try {
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

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (base64Audio) return addWavHeader(base64Audio);
    throw new Error("TTS No Data");
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    throw new Error("合成语音失败");
  }
};
