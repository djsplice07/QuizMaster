import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const generateQuestions = async (topic: string, count: number = 5): Promise<Question[]> => {
  // Use process.env.API_KEY as per guidelines.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Check your .env file.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} trivia questions about "${topic}". The questions should be suitable for a pub quiz.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              answer: { type: Type.STRING, description: "The correct answer" },
              points: { type: Type.INTEGER, description: "Points value, usually 10, 20, or 30" },
              category: { type: Type.STRING, description: "Short category name" }
            },
            required: ["text", "answer", "points", "category"]
          }
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      // Map to our internal ID structure
      return rawData.map((q: any) => ({
        id: crypto.randomUUID(),
        text: q.text,
        answer: q.answer,
        points: q.points,
        category: q.category
      }));
    }
    return [];
  } catch (error) {
    console.error("Gemini generation error:", error);
    return [];
  }
};

export { generateQuestions };