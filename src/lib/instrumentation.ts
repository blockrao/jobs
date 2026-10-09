/**
 * Request-scoped instrumentation for performance diagnostics
 * Tracks database query counts, durations, and request metadata
 *
 * GOAL: Identify duplicate queries and slow data operations
 */

import { AsyncLocalStorage } from "async_hooks";

export interface QueryMetric {
  name: string;
  duration: number; // ms
  timestamp: number;
  count?: number;
}

export interface RequestMetrics {
  requestId: string;
  url: string;
  method: string;
  startTime: number;
  queries: QueryMetric[];
  metadata: Record<string, any>;
}

// Store metrics per request in async context
const metricsStorage = new AsyncLocalStorage<RequestMetrics>();

/**
 * Initialize metrics for a new request
 */
export function initializeMetrics(url: string, method: string = "GET"): RequestMetrics {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const metrics: RequestMetrics = {
    requestId,
    url,
    method,
    startTime: Date.now(),
    queries: [],
    metadata: {},
  };
  return metrics;
}

/**
 * Get current request metrics
 */
export function getMetrics(): RequestMetrics | undefined {
  return metricsStorage.getStore();
}

/**
 * Record a database query
 */
export function recordQuery(name: string, durationMs: number, count: number = 1) {
  const metrics = metricsStorage.getStore();
  if (metrics) {
    metrics.queries.push({
      name,
      duration: durationMs,
      timestamp: Date.now(),
      count,
    });
  }
}

/**
 * Wrap async operations with metrics collection
 */
export function withMetrics<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  return (async () => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    recordQuery(operationName, duration);
    return result;
  })();
}

/**
 * Run code within a metrics context
 */
export function runWithMetrics<T>(
  url: string,
  fn: (metrics: RequestMetrics) => Promise<T>
): Promise<T> {
  const metrics = initializeMetrics(url);
  return metricsStorage.run(metrics, () => fn(metrics));
}

/**
 * Get diagnostics summary
 */
export function getMetricsSummary(metrics: RequestMetrics) {
  const totalDuration = metrics.queries.reduce((sum, q) => sum + q.duration, 0);
  const queryCount = metrics.queries.length;
  const uniqueQueries = new Set(metrics.queries.map((q) => q.name)).size;

  const queriesByName = new Map<string, QueryMetric[]>();
  for (const query of metrics.queries) {
    if (!queriesByName.has(query.name)) {
      queriesByName.set(query.name, []);
    }
    queriesByName.get(query.name)!.push(query);
  }

  const duplicates = Array.from(queriesByName.entries())
    .filter(([_, queries]) => queries.length > 1)
    .map(([name, queries]) => ({
      name,
      count: queries.length,
      totalDuration: queries.reduce((sum, q) => sum + q.duration, 0),
    }));

  return {
    totalDuration,
    queryCount,
    uniqueQueries,
    duplicates,
    ttfb: metrics.startTime + metrics.queries[0]?.duration || 0,
  };
}

/**
 * Format metrics for logging
 */
export function formatMetrics(metrics: RequestMetrics): string {
  const summary = getMetricsSummary(metrics);
  const duplicateInfo =
    summary.duplicates.length > 0
      ? `\n🔴 DUPLICATES FOUND:\n${summary.duplicates
          .map(
            (d) =>
              `   - ${d.name}: called ${d.count} times (${d.totalDuration}ms total)`
          )
          .join("\n")}`
      : "";

  return `
📊 Performance Metrics [${metrics.requestId}]
URL: ${metrics.url}
Total Duration: ${summary.totalDuration}ms
Queries: ${summary.queryCount} (${summary.uniqueQueries} unique)${duplicateInfo}
`;
}
