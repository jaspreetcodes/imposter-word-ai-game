/**
 * Local API server for AI word generation. Frontend calls this; the server uses
 * Ollama via LangChain (@langchain/ollama). Default model: phi3.5.
 * Run: npm run word-gen-server
 * Requires: Ollama with phi3.5 (`ollama pull phi3.5`). Override: OLLAMA_MODEL. Remote Ollama: OLLAMA_BASE_URL.
 */
import "dotenv/config";

import express, { type Express } from "express";
import type { Server } from "node:http";
import {
  AI_GENERATION_LANGUAGES,
  isAiGenerationLanguage,
  normalizeNicheCategoryName,
} from "../src/constants/categories";
import {
  generateWordsForAllCategories,
  generateOneWordPerCategory,
  generateWordsForNicheCategory,
  type WordgenCulturePack,
} from "./wordPipeline/ollamaWordGenerator";
import { checkLocaleCoverage } from "./wordPipeline/firestoreCoverage";
import { hasSeedDictionary } from "./wordPipeline/seedWords";

function parseCulturePack(body: Record<string, unknown>): WordgenCulturePack | undefined {
  const cultureNotes =
    typeof body.cultureNotes === "string" ? body.cultureNotes.trim() : undefined;
  const difficulty =
    body.difficulty === "easy" ||
    body.difficulty === "medium" ||
    body.difficulty === "hard"
      ? body.difficulty
      : undefined;
  const acceptedWords = Array.isArray(body.acceptedWords)
    ? body.acceptedWords.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const rejectedWords = Array.isArray(body.rejectedWords)
    ? body.rejectedWords
        .map((item) => {
          if (item && typeof item === "object" && "word" in item) {
            const o = item as Record<string, unknown>;
            return {
              word: String(o.word ?? "").trim(),
              reason: String(o.reason ?? "").trim(),
            };
          }
          return null;
        })
        .filter(
          (x): x is { word: string; reason: string } =>
            x != null && x.word.length > 0
        )
    : undefined;
  if (
    !cultureNotes &&
    !difficulty &&
    !(acceptedWords?.length) &&
    !(rejectedWords?.length)
  ) {
    return undefined;
  }
  return {
    cultureNotes,
    difficulty,
    acceptedWords,
    rejectedWords,
  };
}

function languageNotAllowedResponse(lang: string) {
  return {
    error: "Language not supported for AI generation",
    message: `"${lang}" is not in the supported list yet. Supported: ${AI_GENERATION_LANGUAGES.join(", ")}.`,
    supportedLanguages: [...AI_GENERATION_LANGUAGES],
  };
}

const PORT = Number(process.env.PORT) || 3001;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "phi3.5";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const READINESS_TIMEOUT_MS = Number(process.env.WORDGEN_READINESS_TIMEOUT_MS) || 2000;
const startedAt = Date.now();

/** Readiness depends on the model host, so probe it instead of assuming it is up. */
async function checkModelHost(): Promise<{ reachable: boolean; detail: string }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(READINESS_TIMEOUT_MS),
    });
    return {
      reachable: response.ok,
      detail: response.ok ? "ok" : `status ${response.status}`,
    };
  } catch (err) {
    return {
      reachable: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Append hints when Ollama's runner dies (Metal/RAM/model pull issues are common on macOS). */
function formatOllamaError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/runner|terminated|load failed|llama|ollama|ECONNREFUSED/i.test(msg)) {
    return msg;
  }
  return (
    `${msg} | Try: restart the Ollama app; \`ollama pull ${process.env.OLLAMA_MODEL ?? "phi3.5"}\`; update Ollama. ` +
    "If GPU crashes persist on Apple Silicon: stop Ollama, then `OLLAMA_LLM_LIBRARY=cpu ollama serve`. " +
    "For less RAM use a smaller model, e.g. `OLLAMA_MODEL=phi3.5` instead of mistral-small3.2."
  );
}

/**
 * The configured Express app, exported without a bound port so tests can mount
 * it directly and CI can control the server lifecycle.
 */
export const app: Express = express();

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/** Liveness: the process is up and serving. Never depends on downstream systems. */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "word-gen-api",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    model: OLLAMA_MODEL,
    supportedLanguages: [...AI_GENERATION_LANGUAGES],
  });
});

/** Readiness: can this instance actually serve a generation request right now? */
app.get("/ready", async (_req, res) => {
  const model = await checkModelHost();
  res.status(model.reachable ? 200 : 503).json({
    status: model.reachable ? "ready" : "degraded",
    checks: {
      modelHost: {
        target: OLLAMA_BASE_URL,
        reachable: model.reachable,
        detail: model.detail,
      },
    },
  });
});

app.options("/api/generate-words", (_req, res) => {
  res.sendStatus(204);
});
app.options("/api/generate-words-mini", (_req, res) => {
  res.sendStatus(204);
});
app.options("/api/generate-niche-words", (_req, res) => {
  res.sendStatus(204);
});
app.options("/api/word-coverage", (_req, res) => {
  res.sendStatus(204);
});

/** Coverage check: word counts per category; cacheMiss when below threshold. */
app.post("/api/word-coverage", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const lang = String(body.language ?? "").trim();
    const reg = String(body.region ?? "").trim();
    const minPerCategory = body.minPerCategory
      ? Number(body.minPerCategory)
      : undefined;
    if (!lang || !reg) {
      res.status(400).json({ error: "Missing language or region" });
      return;
    }
    if (!isAiGenerationLanguage(lang)) {
      res.status(400).json(languageNotAllowedResponse(lang));
      return;
    }
    const coverage = await checkLocaleCoverage(lang, reg, minPerCategory);
    res.json({
      ...coverage,
      hasSeedDictionary: hasSeedDictionary(lang),
    });
  } catch (err) {
    console.error("Coverage check error:", err);
    res.status(500).json({ error: "Coverage check failed" });
  }
});

/** Mini: 1 word per culture-appropriate category (fast). */
app.post("/api/generate-words-mini", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { language, region } = body;
    const lang = String(language ?? "").trim();
    const reg = String(region ?? "").trim();
    if (!lang || !reg) {
      res.status(400).json({ error: "Missing language or region" });
      return;
    }
    if (!isAiGenerationLanguage(lang)) {
      res.status(400).json(languageNotAllowedResponse(lang));
      return;
    }
    const culture = parseCulturePack(body);
    const coverage = await checkLocaleCoverage(lang, reg);
    const useExtendedGrounding =
      body.useExtendedGrounding === true ||
      (body.useExtendedGrounding !== false && coverage.cacheMiss && hasSeedDictionary(lang));
    const words = await generateOneWordPerCategory({
      language: lang,
      region: reg,
      culture,
      useExtendedGrounding,
      categoriesToFill:
        coverage.missingCategories.length > 0
          ? coverage.missingCategories
          : undefined,
    });
    console.log(
      `Mini: ${words.length} words for`,
      lang,
      reg,
      useExtendedGrounding ? "(extended grounding)" : ""
    );
    res.json({ words, coverage, useExtendedGrounding });
  } catch (err) {
    console.error("Mini word generation error:", err);
    res.status(500).json({
      error: "Generation failed",
      message: formatOllamaError(err),
    });
  }
});

app.post("/api/generate-words", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { language, region, countPerCategory } = body;
    const lang = String(language ?? "").trim();
    const reg = String(region ?? "").trim();
    if (!lang || !reg) {
      res.status(400).json({
        error: "Missing language or region",
        message: "Request body must include { language, region }.",
      });
      return;
    }
    if (!isAiGenerationLanguage(lang)) {
      res.status(400).json(languageNotAllowedResponse(lang));
      return;
    }

    const culture = parseCulturePack(body);
    const coverage = await checkLocaleCoverage(lang, reg);

    const useExtendedGrounding =
      body.useExtendedGrounding === true ||
      (body.useExtendedGrounding !== false && coverage.cacheMiss && hasSeedDictionary(lang));

    const words = await generateWordsForAllCategories({
      language: lang,
      region: reg,
      countPerCategory: countPerCategory ? Number(countPerCategory) : undefined,
      culture,
      useExtendedGrounding,
      categoriesToFill:
        coverage.missingCategories.length > 0
          ? coverage.missingCategories
          : undefined,
    });
    console.log(
      "Generated words count:",
      words.length,
      useExtendedGrounding ? "(extended grounding)" : ""
    );
    words.slice(0, 20).forEach((w) => console.log("  ", w.word, w.category));
    res.json({ words, coverage, useExtendedGrounding });
  } catch (err) {
    console.error("Word generation error:", err);
    res.status(500).json({
      error: "Generation failed",
      message: formatOllamaError(err),
    });
  }
});

/**
 * English-only niche category generation.
 * Body: { category, region?, count? }
 */
app.post("/api/generate-niche-words", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawCategory = String(body.category ?? "").trim();
    const region = String(body.region ?? "UK").trim() || "UK";
    const count = body.count ? Number(body.count) : undefined;
    const category = normalizeNicheCategoryName(rawCategory);
    if (!category) {
      res.status(400).json({
        error: "Invalid niche category",
        message:
          "Provide a custom English category name (2–48 chars). Reserved game categories are not allowed.",
      });
      return;
    }
    const culture = parseCulturePack(body);
    const words = await generateWordsForNicheCategory({
      category,
      region,
      count,
      culture,
    });
    console.log(`Niche: ${words.length} words for "${category}" (${region})`);
    res.json({ words, category, language: "English", region });
  } catch (err) {
    console.error("Niche word generation error:", err);
    res.status(500).json({
      error: "Generation failed",
      message: formatOllamaError(err),
    });
  }
});

/** Unknown routes return JSON so API clients never have to parse an HTML error page. */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export function startServer(port = PORT): Server {
  const server = app.listen(port, () => {
    console.log(`Word-gen API: http://localhost:${port}`);
    console.log(`Ollama model: ${OLLAMA_MODEL} (set OLLAMA_MODEL to override)`);
    console.log(`AI languages: ${AI_GENERATION_LANGUAGES.join(", ")}`);
    console.log("GET  /health and /ready for liveness and readiness");
    console.log("POST /api/generate-words with { language, region, countPerCategory? }");
    console.log("POST /api/generate-niche-words with { category, region?, count? } (English only)");
    console.log("POST /api/word-coverage with { language, region, minPerCategory? }");
  });

  // Without this, CI and local runs leave the port held after Ctrl-C / job cancel.
  const shutdown = (signal: string) => () => {
    console.log(`Received ${signal}, shutting down word-gen API`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.once("SIGINT", shutdown("SIGINT"));
  process.once("SIGTERM", shutdown("SIGTERM"));

  return server;
}

const isDirectRun = process.argv[1]?.includes("wordGenServer");
if (isDirectRun) {
  startServer();
}
