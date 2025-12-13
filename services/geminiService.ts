import { GoogleGenAI, Type } from "@google/genai";
import { Sentence, Word } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCantoneseLesson = async (text: string): Promise<Sentence[]> => {
  const model = "gemini-2.5-flash";
  
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

  if (response.text) {
    try {
      const data = JSON.parse(response.text);
      // Ensure unique IDs if the model doesn't generate them well
      return data.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `sent-${Date.now()}-${idx}`
      }));
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("Failed to process text.");
    }
  }

  throw new Error("No response from AI.");
};