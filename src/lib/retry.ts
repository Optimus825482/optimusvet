/**
 * AUTOMATIC RETRY LOGIC
 *
 * Implements retry mechanisms for transient failures:
 * - Exponential backoff
 * - Configurable retry limits
 * - Retry only for retryable errors
 * - Circuit breaker integration
 */

import { AppError } from "./error-handler";

// =====================================================
// RETRY CONFIGURATION
// =====================================================

export interface RetryConfig {
  maxRetries?: number; // Maximum number of retry attempts
  delay?: number; // Initial delay in milliseconds
  backoff?: number; // Backoff multiplier (exponential)
  maxDelay?: number; // Maximum delay between retries
  retryableErrors?: string[]; // Error codes that should trigger retry
  onRetry?: (attempt: number, error: Error) => void; // Callback on retry
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  delay: 1000, // 1 second
  backoff: 2, // Exponential: 1s, 2s, 4s
  maxDelay: 30000, // 30 seconds max
  retryableErrors: [
    "DATABASE_CONNECTION_ERROR",
    "SERVICE_UNAVAILABLE",
    "NETWORK_ERROR",
    "TIMEOUT",
  ],
  onRetry: () => {},
};

// =====================================================
// RETRY LOGIC
// =====================================================

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // AppError with specific codes
  if (error instanceof AppError) {
    return DEFAULT_CONFIG.retryableErrors.includes(error.code);
  }

  // Standard errors with specific messages
  if (error instanceof Error) {
    const retryableMessages = [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNRESET",
      "EPIPE",
    ];

    return retryableMessages.some((msg) => error.message.includes(msg));
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  const delay = config.delay * Math.pow(config.backoff, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === finalConfig.maxRetries - 1) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);

      console.warn(
        `[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
        },
      );

      // Call retry callback
      finalConfig.onRetry(attempt + 1, lastError);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry with custom retry condition
 */
export async function withCustomRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check custom retry condition
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === finalConfig.maxRetries - 1) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);

      console.warn(
        `[CUSTOM RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
      );

      finalConfig.onRetry(attempt + 1, lastError);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  config: RetryConfig = {},
): Promise<T> {
  return withRetry(async () => {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), timeout),
      ),
    ]);
  }, config);
}

/**
 * Batch retry - retry multiple operations
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: RetryConfig = {},
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    operations.map((op) => withRetry(op, config)),
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return { success: true, data: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

/**
 * Retry with jitter (randomized delay to prevent thundering herd)
 */
export async function withRetryAndJitter<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error) || attempt === finalConfig.maxRetries - 1) {
        throw error;
      }

      // Calculate delay with jitter
      const baseDelay = calculateDelay(attempt, finalConfig);
      const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
      const delay = baseDelay + jitter;

      console.warn(
        `[RETRY WITH JITTER] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
      );

      finalConfig.onRetry(attempt + 1, lastError);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: RetryConfig = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}
