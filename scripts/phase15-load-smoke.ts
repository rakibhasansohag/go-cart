const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

export {};

const requestsPerRoute = Number(process.env.PHASE15_LOAD_REQUESTS ?? 20);

if (!Number.isInteger(requestsPerRoute) || requestsPerRoute < 1 || requestsPerRoute > 100) {
  throw new Error("PHASE15_LOAD_REQUESTS must be an integer from 1 to 100.");
}

const routes = ["/api/health", "/browse", "/api/search?q=chair", "/demo/marketplace"];
const startedAt = performance.now();
const responses = await Promise.all(
  routes.flatMap((route) =>
    Array.from({ length: requestsPerRoute }, async () => {
      const started = performance.now();
      const response = await fetch(new URL(route, baseUrl));
      return { route, status: response.status, durationMs: performance.now() - started };
    }),
  ),
);

const failures = responses.filter((response) => response.status < 200 || response.status >= 300);
const summary = routes.map((route) => {
  const durations = responses.filter((response) => response.route === route).map((response) => response.durationMs).sort((a, b) => a - b);
  return {
    route,
    requests: durations.length,
    p50Ms: Math.round(durations[Math.max(0, Math.ceil(durations.length * 0.5) - 1)]),
    p95Ms: Math.round(durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)]),
    maxMs: Math.round(durations.at(-1) ?? 0),
  };
});

console.table(summary);
console.log(`Completed ${responses.length} requests in ${Math.round(performance.now() - startedAt)}ms.`);
if (failures.length) {
  throw new Error(`${failures.length} load-smoke request(s) returned an unexpected status.`);
}
