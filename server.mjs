import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Lumora NOVA" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, webSearch = true } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const config = webSearch ? { tools: [{ googleSearch: {} }] } : undefined;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config
    });

    const metadata = response.candidates?.[0]?.groundingMetadata;
    const sources = (metadata?.groundingChunks || [])
      .map((chunk) => chunk?.web)
      .filter((web) => web?.uri)
      .map((web) => ({ title: web.title || "Source", url: web.uri }));

    res.json({
      reply: response.text || "",
      sources
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "NOVA could not complete the request." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Lumora NOVA running on port ${PORT}`);
});
