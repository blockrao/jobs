/**
 * Database operation instrumentation wrapper
 * Patches getRecruitmentWithPosts and getPostBySlug to track:
 * - Query execution count
 * - Individual query durations
 * - Redirect table lookups
 * - Duplicate calls
 */

const operationCalls = new Map<string, { count: number; durations: number[] }>();

export function recordOperationCall(operation: string, durationMs: number) {
  if (!operationCalls.has(operation)) {
    operationCalls.set(operation, { count: 0, durations: [] });
  }

  const record = operationCalls.get(operation)!;
  record.count++;
  record.durations.push(durationMs);
}

export function resetOperationStats() {
  operationCalls.clear();
}

export function getOperationStats() {
  const stats = new Map<
    string,
    { count: number; totalDuration: number; avgDuration: number; minDuration: number; maxDuration: number }
  >();

  for (const [op, data] of operationCalls.entries()) {
    const totalDuration = data.durations.reduce((a, b) => a + b, 0);
    stats.set(op, {
      count: data.count,
      totalDuration,
      avgDuration: totalDuration / data.count,
      minDuration: Math.min(...data.durations),
      maxDuration: Math.max(...data.durations),
    });
  }

  return stats;
}

export function formatOperationStats(): string {
  const stats = getOperationStats();
  if (stats.size === 0) return "No operations recorded";

  let output = "\n📊 Database Operation Statistics\n";
  output += "================================\n";

  for (const [op, data] of stats.entries()) {
    output += `\n${op}:\n`;
    output += `  Calls: ${data.count}\n`;
    output += `  Total: ${data.totalDuration}ms\n`;
    output += `  Avg: ${data.avgDuration.toFixed(1)}ms\n`;
    output += `  Min: ${data.minDuration.toFixed(1)}ms\n`;
    output += `  Max: ${data.maxDuration.toFixed(1)}ms\n`;
  }

  return output;
}

/**
 * Check for duplicate operations in a request
 */
export function findDuplicates(): { operation: string; count: number }[] {
  const duplicates: { operation: string; count: number }[] = [];

  for (const [op, data] of operationCalls.entries()) {
    if (data.count > 1) {
      duplicates.push({ operation: op, count: data.count });
    }
  }

  return duplicates;
}

export function formatDuplicateWarning(): string {
  const duplicates = findDuplicates();
  if (duplicates.length === 0) return "";

  let warning = "\n🔴 DUPLICATE OPERATIONS DETECTED\n";
  warning += "==================================\n";
  for (const dup of duplicates) {
    warning += `${dup.operation}: called ${dup.count} times (${dup.count - 1} unnecessary)\n`;
  }

  return warning;
}
