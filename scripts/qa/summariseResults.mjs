/**
 * Turns raw test output into a short markdown report for the GitHub Actions job
 * summary, so a failing run can be triaged from the run page without downloading
 * artifacts.
 *
 * Usage: node scripts/qa/summariseResults.mjs <newman|cypress|k6>
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const KIND = process.argv[2];

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function xmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => join(dir, file));
}

function attrs(tag) {
  const out = {};
  for (const [, key, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    out[key] = value;
  }
  return out;
}

/**
 * Minimal JUnit reader: enough for totals and failed test names. Counts
 * individual <testcase> elements, which is the unit both Newman (assertions)
 * and Cypress (tests) report.
 */
function readJUnit(files) {
  let tests = 0;
  let failures = 0;
  let skipped = 0;
  let time = 0;
  const failed = [];

  for (const file of files) {
    const xml = readFileSync(file, "utf8");

    const wrapper = xml.match(/<testsuites\b[^>]*>/);
    if (wrapper) {
      time += Number(attrs(wrapper[0]).time || 0);
    } else {
      for (const [, tag] of xml.matchAll(/(<testsuite\b[^>]*>)/g)) {
        time += Number(attrs(tag).time || 0);
      }
    }

    // Self-closing <testcase ... /> means a pass; a nested body may hold failures.
    for (const [, caseTag, body] of xml.matchAll(
      /(<testcase\b[^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g
    )) {
      tests++;
      const content = body ?? "";
      if (/<skipped/.test(content)) {
        skipped++;
        continue;
      }
      if (!/<failure|<error/.test(content)) continue;
      failures++;
      const a = attrs(caseTag);
      failed.push(`${a.classname ? `${a.classname} → ` : ""}${a.name}`);
    }
  }

  return { tests, failures, skipped, time, failed };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function passRate(total, failures) {
  if (total === 0) return "n/a";
  return `${(((total - failures) / total) * 100).toFixed(1)}%`;
}

function summariseNewman() {
  const junit = readJUnit(xmlFiles("reports/newman"));
  const json = readJson("reports/newman/newman-report.json");

  const lines = ["## API contract results", ""];
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Assertions | ${junit.tests} |`);
  lines.push(`| Failed | ${junit.failures} |`);
  lines.push(`| Pass rate | ${passRate(junit.tests, junit.failures)} |`);
  lines.push(`| Total request time | ${junit.time.toFixed(2)}s |`);

  if (json?.run) {
    const executions = json.run.executions ?? [];
    const times = executions
      .map((e) => e.response?.responseTime)
      .filter((t) => typeof t === "number");
    const errorCount = executions.filter(
      (e) => (e.response?.code ?? 0) >= 500 || e.requestError
    ).length;

    lines.push(`| Requests | ${executions.length} |`);
    lines.push(`| Response time p95 | ${percentile(times, 95)} ms |`);
    lines.push(
      `| Unexpected 5xx / transport errors | ${errorCount} (${passRate(
        executions.length,
        errorCount
      )} clean) |`
    );
  }

  if (junit.failed.length > 0) {
    lines.push("", "### Failed assertions", "");
    junit.failed.forEach((name) => lines.push(`- ${name}`));
  }

  return lines.join("\n");
}

function summariseCypress() {
  const junit = readJUnit(xmlFiles("reports/cypress"));

  const lines = ["## End-to-end results", ""];
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Tests | ${junit.tests} |`);
  lines.push(`| Failed | ${junit.failures} |`);
  lines.push(`| Skipped | ${junit.skipped} |`);
  lines.push(`| Pass rate | ${passRate(junit.tests, junit.failures)} |`);
  lines.push(`| Duration | ${junit.time.toFixed(1)}s |`);

  if (junit.failed.length > 0) {
    lines.push(
      "",
      "### Failed tests",
      "",
      "Screenshots and video for each failure are attached as run artifacts.",
      ""
    );
    junit.failed.forEach((name) => lines.push(`- ${name}`));
  }

  return lines.join("\n");
}

function summariseK6() {
  const summary = readJson("reports/k6/summary.json");
  if (!summary) return "## Load results\n\nNo k6 summary found.";

  // `k6 run --summary-export` writes metric values at the top level of each metric.
  const metrics = summary.metrics ?? {};
  const duration = metrics.http_req_duration ?? {};
  const failed = metrics.http_req_failed ?? {};
  const checks = metrics.checks ?? {};
  const checkTotal = (checks.passes ?? 0) + (checks.fails ?? 0);

  const lines = ["## Load results", ""];
  lines.push("| Metric | Value |", "| --- | --- |");
  lines.push(`| Requests | ${metrics.http_reqs?.count ?? "n/a"} |`);
  lines.push(`| p95 response time | ${(duration["p(95)"] ?? 0).toFixed(0)} ms |`);
  lines.push(`| Failed request rate | ${((failed.value ?? 0) * 100).toFixed(2)}% |`);
  lines.push(
    `| Checks passed | ${checks.passes ?? 0}/${checkTotal} (${passRate(
      checkTotal,
      checks.fails ?? 0
    )}) |`
  );

  // Each threshold exports `true` when it last failed.
  const breached = Object.entries(metrics).flatMap(([metric, values]) =>
    Object.entries(values.thresholds ?? {})
      .filter(([, lastFailed]) => lastFailed === true)
      .map(([expression]) => `${metric}: ${expression}`)
  );
  if (breached.length > 0) {
    lines.push("", "### Breached thresholds", "");
    breached.forEach((entry) => lines.push(`- ${entry}`));
  }

  return lines.join("\n");
}

const summaries = {
  newman: summariseNewman,
  cypress: summariseCypress,
  k6: summariseK6,
};

const summarise = summaries[KIND];
if (!summarise) {
  console.error(`Unknown report kind "${KIND}". Use one of: ${Object.keys(summaries).join(", ")}`);
  process.exit(1);
}

console.log(summarise());
