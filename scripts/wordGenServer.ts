/**
 * Local API server for AI word generation. Frontend calls this; server uses
 * Groq API via LangChain (default: GPT OSS 120B). Run: npm run word-gen-server
 * Requires: GROQ_API_KEY in .env. Set GROQ_MODEL to change model (e.g. openai/gpt-oss-120b).
 */
import "dotenv/config";

import express from "express";
import {
  generateWordsForAllCategories,
  generateWords,
} from "./wordPipeline/wordGenerator";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("/api/generate-words", (_req, res) => {
  res.sendStatus(204);
});
app.options("/api/generate-words-mini", (_req, res) => {
  res.sendStatus(204);
});

/** Mini: 1 word (Food only). Fast so user can redirect; full run (20 per category) continues in background. */
app.post("/api/generate-words-mini", async (req, res) => {
  try {
    const { language, region } = req.body ?? {};
    const lang = String(language ?? "").trim();
    const reg = String(region ?? "").trim();
    if (!lang || !reg) {
      res.status(400).json({ error: "Missing language or region" });
      return;
    }
    const words = await generateWords({
      category: "Food",
      language: lang,
      region: reg,
      count: 1,
    });
    console.log("Mini: 1 word for", lang, reg);
    res.json({ words });
  } catch (err) {
    console.error("Mini word generation error:", err);
    res.status(500).json({ error: "Generation failed", message: err instanceof Error ? err.message : "Unknown" });
  }
});
app.post("/api/generate-words", async (req, res) => {
  try {
    const { language, region, countPerCategory } = req.body ?? {};
    const lang = String(language ?? "").trim();
    const reg = String(region ?? "").trim();
    if (!lang || !reg) {
      res.status(400).json({
        error: "Missing language or region",
        message: "Request body must include { language, region }.",
      });
      return;
    }

    const words = await generateWordsForAllCategories({
      language: lang,
      region: reg,
      countPerCategory: countPerCategory ? Number(countPerCategory) : undefined,
    });
    console.log("Generated words count:", words.length);
    words.slice(0, 20).forEach((w) => console.log("  ", w.word, w.category));
    res.json({ words });
  } catch (err) {
    console.error("Word generation error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    res.status(500).json({ error: "Generation failed", message });
  }
});

const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

app.listen(PORT, () => {
  console.log(`Word-gen API: http://localhost:${PORT}`);
  console.log(`Groq model: ${GROQ_MODEL} (set GROQ_MODEL to override)`);
  console.log("POST /api/generate-words with { language, region, countPerCategory? }");
});
