/**
 * Scheduled reliability check for AI word generation against a real model host.
 *
 * Deliberately single-VU and sequential. Concurrent LLM load would measure the
 * Ollama host's capacity rather than an application regression, and it would
 * make the result depend on whatever else that machine is doing. What we want
 * to know on a schedule is narrower: does generation still succeed, does it
 * still return a valid word list, and has it become dramatically slower?
 *
 *   BASE_URL=http://staging-host:3001 k6 run k6/generation-reliability.js
 */

import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3001";
const LANGUAGE = __ENV.LANGUAGE || "Punjabi";
const REGION = __ENV.REGION || "Punjab";
const ITERATIONS = Number(__ENV.ITERATIONS || 5);
const MAX_DURATION_MS = Number(__ENV.MAX_DURATION_MS || 60000);

const generationDuration = new Trend("generation_ms", true);
const validPayload = new Rate("generation_payload_valid");

export const options = {
  scenarios: {
    generation: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: ITERATIONS,
      maxDuration: "20m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    generation_ms: [`p(95)<${MAX_DURATION_MS}`],
    generation_payload_valid: ["rate==1"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  const ready = http.get(`${BASE_URL}/ready`);
  if (ready.status !== 200) {
    throw new Error(
      `Word-gen API is not ready (${ready.status}): ${ready.body}. Start the model host before running this scenario.`
    );
  }
}

function isValidWordList(response) {
  if (response.status !== 200) return false;
  const words = response.json("words");
  if (!Array.isArray(words) || words.length === 0) return false;
  return words.every(
    (w) =>
      typeof w.word === "string" &&
      w.word.trim().length > 0 &&
      !/\s/.test(w.word) &&
      typeof w.category === "string" &&
      w.category.length > 0
  );
}

export default function () {
  const response = http.post(
    `${BASE_URL}/api/generate-words-mini`,
    JSON.stringify({ language: LANGUAGE, region: REGION }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: `${MAX_DURATION_MS * 3}ms`,
      tags: { name: "generate-words-mini" },
    }
  );

  generationDuration.add(response.timings.duration);
  const valid = isValidWordList(response);
  validPayload.add(valid);

  check(response, {
    "generation responds 200": (r) => r.status === 200,
    "generation returns a usable word list": () => valid,
    "generation stays within the time budget": (r) =>
      r.timings.duration < MAX_DURATION_MS,
  });
}
