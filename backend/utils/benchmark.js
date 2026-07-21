/**
 * Benchmark script for the "System response time ≤ 2 seconds" KPI.
 *
 * Hits a set of endpoints several times and reports avg/max response time
 * against the 2000ms target. Public endpoints are tested by default; to
 * also benchmark protected endpoints, log in first and pass the token via
 * BENCHMARK_TOKEN.
 *
 * Usage:
 *   1. Start the server in another terminal: npm run dev
 *   2. Run:                                  npm run benchmark
 *
 * Optional env vars:
 *   BENCHMARK_URL   - base URL (default: http://localhost:5000)
 *   BENCHMARK_TOKEN - JWT to also benchmark protected endpoints
 *   BENCHMARK_RUNS  - samples per endpoint (default: 5)
 */
require("dotenv").config();
const http = require("http");

const BASE_URL = process.env.BENCHMARK_URL || "http://localhost:5000";
const TARGET_MS = 2000;
const RUNS = Number(process.env.BENCHMARK_RUNS) || 5;
const TOKEN = process.env.BENCHMARK_TOKEN || "";

const PUBLIC_ENDPOINTS = [
  { method: "GET", path: "/" },
  { method: "GET", path: "/api/properties" },
];

const PROTECTED_ENDPOINTS = [
  { method: "GET", path: "/api/maintenance" },
  { method: "GET", path: "/api/amenities" },
  { method: "GET", path: "/api/bookings" },
  { method: "GET", path: "/api/dashboard/overview" },
];

const timeRequest = (method, path) =>
  new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

    const req = http.request(`${BASE_URL}${path}`, { method, headers }, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        resolve({ status: res.statusCode, durationMs });
      });
    });
    req.on("error", reject);
    req.end();
  });

const benchmarkEndpoint = async ({ method, path }) => {
  const samples = [];
  for (let i = 0; i < RUNS; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { durationMs } = await timeRequest(method, path);
      samples.push(durationMs);
    } catch (err) {
      console.error(`  Could not reach ${method} ${path}: ${err.message}`);
      return null;
    }
  }

  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const max = Math.max(...samples);
  const pass = max <= TARGET_MS;

  console.log(
    `${pass ? "PASS" : "FAIL"}  ${method.padEnd(4)} ${path.padEnd(28)} avg=${avg.toFixed(1)}ms  max=${max.toFixed(
      1
    )}ms  (n=${samples.length})`
  );

  return pass;
};

const run = async () => {
  console.log(`Benchmarking ${BASE_URL} against the ≤ ${TARGET_MS}ms response time KPI\n`);

  const endpoints = TOKEN ? [...PUBLIC_ENDPOINTS, ...PROTECTED_ENDPOINTS] : PUBLIC_ENDPOINTS;
  if (!TOKEN) {
    console.log("(No BENCHMARK_TOKEN set - skipping protected endpoints. See script header for details.)\n");
  }

  const results = [];
  for (const endpoint of endpoints) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await benchmarkEndpoint(endpoint));
  }

  const allPassed = results.every((r) => r === true);
  console.log(`\nOverall: ${allPassed ? "All endpoints within target \u2705" : "Some endpoints exceeded target or failed \u274C"}`);
  process.exit(allPassed ? 0 : 1);
};

run();
