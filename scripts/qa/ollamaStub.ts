/**
 * Deterministic stand-in for Ollama, used by API contract tests.
 *
 * The word-gen server talks to Ollama through LangChain, which speaks the
 * `/api/chat` protocol. This stub implements just enough of that protocol to
 * return predictable word lists, so CI can exercise the real generation path
 * (prompt building, parsing, judging, Firestore coverage) without a GPU host
 * and without flaky model output.
 *
 * Run: npm run qa:ollama-stub   (PORT defaults to 11434)
 */

import express from "express";

const PORT = Number(process.env.OLLAMA_STUB_PORT) || 11434;
const MODEL = process.env.OLLAMA_STUB_MODEL ?? "phi3.5";
/** Set to simulate a slow or failing model host in negative tests. */
const FAIL_MODE = process.env.OLLAMA_STUB_FAIL === "true";
const DELAY_MS = Number(process.env.OLLAMA_STUB_DELAY_MS) || 0;

interface ChatMessage {
  role: string;
  content: string;
}

type PromptMode = "generate-one-per-category" | "generate-category" | "judge" | "refine";

function detectMode(system: string, user: string): PromptMode {
  if (/strict editor/i.test(system)) return "judge";
  if (/replace weak words/i.test(system)) return "refine";
  if (/one word per category, in this order/i.test(user)) {
    return "generate-one-per-category";
  }
  return "generate-category";
}

function matchFirst(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function readLanguage(user: string): string {
  return matchFirst(user, [/^-\s*Language:\s*(.+)$/m, /Language:\s*([^.\n]+)/]) || "English";
}

function readRegion(user: string): string {
  return matchFirst(user, [/^-\s*Region:\s*(.+)$/m, /Region:\s*([^.\n]+)/]) || "UK";
}

function readCategory(user: string): string {
  return (
    matchFirst(user, [
      /single-word items for the category "([^"]+)"/,
      /^-\s*Category:\s*(.+)$/m,
      /^Category:\s*(.+)$/m,
    ]) || "Food"
  );
}

function readCount(user: string): number {
  const match = user.match(/Generate exactly (\d+) single-word items/);
  return match ? Number(match[1]) : 1;
}

function readCategoryList(user: string): string[] {
  const match = user.match(/one word per category, in this order\):\s*(.+)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function readJsonArray(user: string, afterMarker: RegExp): unknown[] {
  const markerIndex = user.search(afterMarker);
  const searchFrom = markerIndex === -1 ? 0 : markerIndex;
  const start = user.indexOf("[", searchFrom);
  const end = user.indexOf("]", start);
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(user.slice(start, end + 1)) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Stable, obviously synthetic token so seeded data is never confused with real words. */
function stubWord(category: string, index: number, salt = ""): string {
  const slug = `${category}${salt}`.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10) || "word";
  return `qa${slug}${index}`;
}

function wordItem(word: string, category: string, language: string, region: string) {
  return { word, category, language, region };
}

function buildReply(messages: ChatMessage[]): string {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n");
  const mode = detectMode(system, user);
  const language = readLanguage(user);
  const region = readRegion(user);

  if (mode === "judge") {
    const candidates = readJsonArray(user, /Candidates \(JSON array/);
    const accepted = candidates
      .map((c) => (c && typeof c === "object" ? String((c as { word?: unknown }).word ?? "") : ""))
      .filter(Boolean);
    return JSON.stringify({ accepted, rejected: [] });
  }

  if (mode === "refine") {
    const category = readCategory(user);
    const rejected = readJsonArray(user, /Rejected with reasons/);
    return JSON.stringify(
      rejected.map((_, i) => wordItem(stubWord(category, i + 1, "fix"), category, language, region))
    );
  }

  if (mode === "generate-one-per-category") {
    const categories = readCategoryList(user);
    return JSON.stringify(
      categories.map((category) => wordItem(stubWord(category, 1), category, language, region))
    );
  }

  const category = readCategory(user);
  const count = readCount(user);
  return JSON.stringify(
    Array.from({ length: count }, (_, i) =>
      wordItem(stubWord(category, i + 1), category, language, region)
    )
  );
}

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.type("text/plain").send("Ollama stub is running");
});

app.get("/api/tags", (_req, res) => {
  res.json({
    models: [
      {
        name: MODEL,
        model: MODEL,
        size: 0,
        digest: "stub",
        modified_at: new Date(0).toISOString(),
        details: { family: "stub", parameter_size: "0B", quantization_level: "none" },
      },
    ],
  });
});

app.post("/api/chat", async (req, res) => {
  if (FAIL_MODE) {
    res.status(500).json({ error: "stub failure mode" });
    return;
  }
  if (DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  const body = (req.body ?? {}) as { messages?: ChatMessage[]; stream?: boolean };
  const content = buildReply(Array.isArray(body.messages) ? body.messages : []);
  const base = {
    model: MODEL,
    created_at: new Date().toISOString(),
    done_reason: "stop",
    total_duration: 1,
    load_duration: 1,
    prompt_eval_count: 1,
    prompt_eval_duration: 1,
    eval_count: 1,
    eval_duration: 1,
  };

  if (body.stream === false) {
    res.json({ ...base, message: { role: "assistant", content }, done: true });
    return;
  }

  // ollama-js reads a newline-delimited JSON stream when stream is not disabled.
  res.setHeader("Content-Type", "application/x-ndjson");
  res.write(
    `${JSON.stringify({ ...base, message: { role: "assistant", content }, done: false })}\n`
  );
  res.write(`${JSON.stringify({ ...base, message: { role: "assistant", content: "" }, done: true })}\n`);
  res.end();
});

app.listen(PORT, () => {
  console.log(`Ollama stub listening on http://127.0.0.1:${PORT} (model ${MODEL})`);
});
