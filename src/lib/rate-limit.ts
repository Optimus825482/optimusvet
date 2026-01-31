/**
 * RATE LIMITING MIDDLEWARE
 *
 * Prevents API abuse and DoS attacks
 * - IP-based rate limiting
 * - User-based rate limiting
 * - Configurable limits per endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import LRUCache from "lru-cache";

// Rate limit configuration
interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens (IPs/users) to track
  maxRequests: number; // Max requests per interval
}

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Track 500 unique IPs
  maxRequests: 10, // 10 requests per minute
};

// Rate limit store (in-memory cache)
// For production, use Redis or similar distributed cache
const rateLimitStore = new LRUCache<string, number[]>({
  max: DEFAULT_CONFIG.uniqueTokenPerInterval,
  ttl: DEFAULT_CONFIG.interval,
});

/**
 * Get client identifier (IP address or user ID)
 */
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const clientIp = request.headers.get("x-client-ip");
  if (clientIp) {
    return clientIp;
  }

  // Fallback to a generic identifier
  return "anonymous";
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {},
): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const { interval, maxRequests } = { ...DEFAULT_CONFIG, ...config };

  const now = Date.now();
  const windowStart = now - interval;

  // Get existing timestamps for this identifier
  let timestamps = rateLimitStore.get(identifier) || [];

  // Filter out timestamps outside the current window
  timestamps = timestamps.filter(
    (timestamp: number) => timestamp > windowStart,
  );

  // Check if limit exceeded
  if (timestamps.length >= maxRequests) {
    const oldestTimestamp = timestamps[0];
    const resetTime = oldestTimestamp + interval;

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add current timestamp
  timestamps.push(now);
  rateLimitStore.set(identifier, timestamps);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - timestamps.length,
    reset: now + interval,
  };
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  config: Partial<RateLimitConfig> = {},
) {
  return async (
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> => {
    const identifier = getClientIdentifier(request);
    const result = checkRateLimit(identifier, config);

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": new Date(result.reset).toISOString(),
    };

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message:
              "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.",
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          },
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": Math.ceil(
              (result.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    // Call the original handler
    const response = await handler(request, ...args);

    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Strict: 5 requests per minute
  STRICT: {
    interval: 60 * 1000,
    maxRequests: 5,
  },

  // Standard: 10 requests per minute
  STANDARD: {
    interval: 60 * 1000,
    maxRequests: 10,
  },

  // Relaxed: 30 requests per minute
  RELAXED: {
    interval: 60 * 1000,
    maxRequests: 30,
  },

  // Generous: 100 requests per minute
  GENEROUS: {
    interval: 60 * 1000,
    maxRequests: 100,
  },

  // Per second: 1 request per second
  PER_SECOND: {
    interval: 1000,
    maxRequests: 1,
  },

  // Per hour: 1000 requests per hour
  PER_HOUR: {
    interval: 60 * 60 * 1000,
    maxRequests: 1000,
  },
};

/**
 * Clear rate limit for a specific identifier (admin use)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limits (admin use)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get rate limit stats for monitoring
 */
export function getRateLimitStats(): {
  totalTracked: number;
  cacheSize: number;
} {
  return {
    totalTracked: rateLimitStore.size,
    cacheSize: rateLimitStore.max,
  };
}
