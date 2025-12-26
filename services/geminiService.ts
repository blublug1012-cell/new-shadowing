
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
  // Switching to Flash model to avoid RESOURCE_EXHAUSTED errors while maintaining high quality for linguistic tasks.
  const model = "gemini-3-flash-preview";
  
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
       - If it is English or Punctuation: Return an empty array [] for jyutping.
       - 'selectedJyutping' should default to the first jyutping.

    Text to analyze:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized Cantonese teacher. You handle code-switching perfectly and provide high-accuracy contextual Jyutping. You only output valid JSON.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }, // Flash doesn't need high thinking budget for this extraction task
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
    // User-friendly error mapping
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("AI 额度已达上限（每分钟请求太频繁）。请稍等 1 分钟后再试，或者减少一次性输入的内容量。");
    }
    throw new Error(error.message || "生成内容失败，请检查网络或稍后再试。");
  }

  throw new Error("AI 未返回有效内容。");
};

export const generateCantoneseSpeech = async (text: string): Promise<string> => {
  if (!text || !text.trim()) {
    throw new Error("Text is empty");
  }

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
    
    if (base64Audio) {
      return addWavHeader(base64Audio);
    }
    throw new Error("TTS 语音生成失败，未收到音频数据。");
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("语音合成频率太快，请稍后再试。");
    }
    throw new Error(error.message || "合成语音失败");
  }
};
