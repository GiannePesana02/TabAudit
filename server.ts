import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Gemini API analyze route
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { tabs, existingGroups, apiKey } = req.body;

    const usedApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!usedApiKey) {
      return res.status(400).json({
        error: "Missing API Key. Please add a Gemini API Key in Settings or set GEMINI_API_KEY in the environment.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: usedApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const tabSummary = (tabs || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      url: t.url,
      index: t.index,
    }));

    const prompt = `
You are an expert browser tab organizer. Analyze these open tabs and existing groups, then return a structured JSON object with smart suggestions.

Open tabs:
${JSON.stringify(tabSummary, null, 2)}

Existing groups:
${JSON.stringify(existingGroups || [], null, 2)}

Rules for analysis:
1. "suggestedGroups": Suggest new groups for tabs NOT already in an existing group. Group names should be 2-4 short, descriptive words (e.g. "React Tutorials", "Travel Options", "Bug Tracking"). Color must be one of: "blue", "green", "red", "yellow", "purple", "pink", "cyan".
2. "freezeSuggestions": Suggest freezing groups or a set of tabs if they have 3+ tabs and contain tabs that are likely stale/idle/buried and non-essential. Give a brief, compelling one-sentence reason including typical RAM savings (e.g., "5 idle tabs · ~400MB freed").
3. "ungroupedTabIds": Identify any tab IDs that don't fit any group.
4. If no meaningful suggestions can be made, return empty arrays.
5. NEVER suggest freezing the currently active tab or tabs that have been active recently.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional tab manager assistant. Analyze the tab lists and return a crisp JSON summary of suggestions without any markdown styling or block wrappers.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedGroups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  color: { type: Type.STRING },
                  tabIds: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  reason: { type: Type.STRING },
                },
                required: ["name", "color", "tabIds", "reason"],
              },
            },
            freezeSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  groupName: { type: Type.STRING },
                  tabIds: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  reason: { type: Type.STRING },
                },
                required: ["groupName", "tabIds", "reason"],
              },
            },
            ungroupedTabIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
          },
          required: ["suggestedGroups", "freezeSuggestions", "ungroupedTabIds"],
        },
      },
    });

    const rawText = response.text || "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const suggestions = JSON.parse(cleaned);

    return res.json(suggestions);
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze tabs with Gemini" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
