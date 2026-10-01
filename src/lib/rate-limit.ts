/**
 * Simple In-Memory Rate Limiter
 *
 * For production, consider using Redis or a dedicated service
 * This implementation is suitable for moderate traffic
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Rate limit by key (IP address, user ID, etc.)
 * @param key - Unique identifier (usually IP address)
 * @param limit - Max requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Object with { success: boolean, remaining: number, resetTime: number }
 */
export function rateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute default
) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Create new window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  // Within existing window
  if (record.count < limit) {
    record.count++;
    return {
      success: true,
      remaining: limit - record.count,
      resetTime: record.resetTime,
    };
  }

  // Limit exceeded
  return {
    success: false,
    remaining: 0,
    resetTime: record.resetTime,
  };
}

/**
 * Get client IP from request
 * Handles X-Forwarded-For header for proxies
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("cf-connecting-ip") || "unknown";
}

/**
 * Cleanup old rate limit entries
 * Call periodically to prevent memory leak
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 10 minutes
setInterval(cleanupRateLimits, 10 * 60 * 1000);
