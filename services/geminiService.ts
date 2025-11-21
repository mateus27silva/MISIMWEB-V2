import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeSimulationResults = async (
  context: string,
  data: any
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "AI Analysis Unavailable: No API Key provided in environment variables.";
  }

  try {
    const prompt = `
      You are a Senior Metallurgist and Mineral Processing Engineer.
      Analyze the following simulation results for a ${context} context.
      Provide insights on efficiency, potential issues (e.g., roping in cyclones, overload in mills), and recommendations.
      Keep it concise (max 2 paragraphs).
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate AI analysis. Please check your connection or API quota.";
  }
};
