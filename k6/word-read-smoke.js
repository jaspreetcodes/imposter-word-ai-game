/**
 * Load smoke for the read path players hit on every round: the Firestore word
 * catalog and the coverage endpoint that decides cache hit vs AI generation.
 *
 * Run against a seeded test environment:
 *   npm run load:smoke
 *   BASE_URL=http://127.0.0.1:3001 k6 run k6/word-read-smoke.js
 *
 * This is a regression detector, not a capacity test: modest concurrency, tight
 * thresholds, and it must never point at production data.
 */

import http from "k6/http";
import { check, group } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3001";
const FIRESTORE_HOST = __ENV.FIRESTORE_HOST || "127.0.0.1:8080";
const PROJECT_ID = __ENV.PROJECT_ID || "demo-mafiasword";
const LANGUAGE = __ENV.LANGUAGE || "Punjabi";
const REGION = __ENV.REGION || "Punjab";
const EXPECTED_WORDS = Number(__ENV.EXPECTED_WORDS || 50);

const catalogRead = new Trend("catalog_read_ms", true);
const coverageCheck = new Trend("coverage_check_ms", true);

export const options = {
  scenarios: {
    // A fixed arrival rate keeps the load identical between runs, so a change in
    // p95 means the application changed rather than the generated load.
    catalog_reads: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 10),
      timeUnit: "1s",
      duration: __ENV.DURATION || "30s",
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    catalog_read_ms: ["p(95)<1000"],
    coverage_check_ms: ["p(95)<1000"],
    checks: ["rate>0.99"],
  },
};

const catalogUrl = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/words?pageSize=200`;

export default function () {
  group("catalog read", () => {
    const response = http.get(catalogUrl, {
      headers: { Authorization: "Bearer owner" },
      tags: { name: "firestore-words" },
    });
    catalogRead.add(response.timings.duration);

    check(response, {
      "catalog responds 200": (r) => r.status === 200,
      "catalog returns the seeded words": (r) => {
        if (r.status !== 200) return false;
        const documents = r.json().documents;
        return Array.isArray(documents) && documents.length >= EXPECTED_WORDS;
      },
    });
  });

  group("coverage check", () => {
    const response = http.post(
      `${BASE_URL}/api/word-coverage`,
      JSON.stringify({ language: LANGUAGE, region: REGION }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "word-coverage" },
      }
    );
    coverageCheck.add(response.timings.duration);

    check(response, {
      "coverage responds 200": (r) => r.status === 200,
      "coverage reports a cache hit for the seeded locale": (r) =>
        r.status === 200 && r.json().cacheMiss === false,
      "coverage returns per-category counts": (r) =>
        r.status === 200 && Object.keys(r.json().categoryCounts ?? {}).length > 0,
    });
  });
}
