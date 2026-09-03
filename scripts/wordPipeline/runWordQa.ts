/**
 * Golden QA runner — validates word batch shape (no live Ollama required for unit checks).
 * Run: npm run word-qa
 */

import * as fs from "fs";
import * as path from "path";
import { validateGeneratedWords } from "./validateGeneratedWords";
import { parseJsonArray } from "./ollamaWordGenerator";
import type { WordDocumentLike } from "./ollamaWordGenerator";

const FIXTURE_PATH = path.join(
  process.cwd(),
  "scripts/wordPipeline/fixtures/qa-golden.json"
);

interface GoldenFixture {
  language: string;
  region: string;
  cases: Array<{
    category: string;
    minWords?: number;
    mustIncludeAny?: string[];
    mustNotInclude?: string[];
    sampleJson?: string;
  }>;
}

function toDocs(
  items: ReturnType<typeof parseJsonArray>,
  language: string,
  region: string
): WordDocumentLike[] {
  return items.map((i) => ({
    word: i.word,
    category: i.category,
    languages: [language],
    regions: [region],
  }));
}

async function main() {
  if (!fs.existsSync(FIXTURE_PATH)) {
    console.error("Missing fixture:", FIXTURE_PATH);
    process.exit(1);
  }

  const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8")) as GoldenFixture;
  let failed = 0;

  for (const c of fixture.cases) {
    const sample =
      c.sampleJson ??
      `[{"word":"roti","category":"${c.category}","language":"${fixture.language}","region":"${fixture.region}"}]`;
    const parsed = parseJsonArray(sample);
    const docs = toDocs(parsed, fixture.language, fixture.region);

    const issues = validateGeneratedWords(docs, {
      expectedCategory: c.category,
      expectedLanguage: fixture.language,
      requireLatinScript: true,
    });

    if (issues.length > 0) {
      console.error(`FAIL ${c.category}:`, issues.map((i) => i.message).join("; "));
      failed++;
      continue;
    }

    if (c.minWords && docs.length < c.minWords) {
      console.error(`FAIL ${c.category}: expected >= ${c.minWords} words, got ${docs.length}`);
      failed++;
      continue;
    }

    const wordsLower = docs.map((d) => d.word.toLowerCase());
    if (c.mustNotInclude?.some((w) => wordsLower.includes(w.toLowerCase()))) {
      console.error(`FAIL ${c.category}: contains forbidden word`);
      failed++;
      continue;
    }

    if (
      c.mustIncludeAny?.length &&
      !c.mustIncludeAny.some((w) => wordsLower.includes(w.toLowerCase()))
    ) {
      console.error(`FAIL ${c.category}: none of mustIncludeAny present`);
      failed++;
      continue;
    }

    console.log(`PASS ${c.category} (${docs.length} word(s))`);
  }

  if (failed > 0) {
    console.error(`\n${failed} case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll golden cases passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
