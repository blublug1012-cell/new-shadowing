import { GoogleGenAI, Type } from "@google/genai";
import { Sentence, Word } from "../types";

export const generateCantoneseLesson = async (text: string): Promise<Sentence[]> => {
  // ADAPTATION: We use import.meta.env.VITE_API_KEY which is the standard way Vite handles env vars.
  // This bypasses the Netlify "Exposed secrets" build error caused by manual process.env polyfills.
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    const msg = "System Error: API Key is missing. \n\nPlease ensure you have set 'VITE_API_KEY' in your Netlify Environment Variables and triggered a RE-DEPLOY.";
    console.error(msg);
    throw new Error(msg);
  }
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
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

    if (response.text) {
      let cleanText = response.text.trim();
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
      }

      try {
        const data = JSON.parse(cleanText);
        return data.map((s: any, idx: number) => ({
          ...s,
          id: s.id || `sent-${Date.now()}-${idx}`
        }));
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Raw Text received:", response.text);
        throw new Error("AI returned invalid data format. Please try again.");
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    throw new Error(error.message || "Unknown API Error");
  }

  throw new Error("No response from AI.");
};