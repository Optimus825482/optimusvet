/**
 * CIRCUIT BREAKER PATTERN
 *
 * Prevents cascading failures by stopping requests to failing services:
 * - Three states: CLOSED, OPEN, HALF_OPEN
 * - Automatic recovery attempts
 * - Configurable thresholds
 * - Metrics tracking
 */

import { AppError, ServiceUnavailableError } from "./error-handler";

// =====================================================
// CIRCUIT BREAKER TYPES
// =====================================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of failures before opening
  successThreshold?: number; // Number of successes to close from half-open
  timeout?: number; // Time in ms before attempting recovery
  monitoringPeriod?: number; // Time window for failure counting
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

interface CircuitMetrics {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

// =====================================================
// CIRCUIT BREAKER CLASS
// =====================================================

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private metrics: CircuitMetrics = {
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
  };

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(
    private readonly name: string,
    config: CircuitBreakerConfig = {},
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod ?? 60000, // 1 minute
      onStateChange: config.onStateChange ?? (() => {}),
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.transitionTo("HALF_OPEN");
      } else {
        throw new ServiceUnavailableError(
          `Circuit breaker is OPEN for ${this.name}`,
        );
      }
    }

    this.metrics.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    // If in HALF_OPEN state, check if we should close
    if (this.state === "HALF_OPEN") {
      if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo("CLOSED");
        this.resetMetrics();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.metrics.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (
      this.state === "CLOSED" &&
      this.metrics.consecutiveFailures >= this.config.failureThreshold
    ) {
      this.transitionTo("OPEN");
    }

    // If in HALF_OPEN state, go back to OPEN on any failure
    if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN");
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    if (!this.metrics.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime;
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    this.state = newState;

    console.log(`[CIRCUIT BREAKER] ${this.name}: ${oldState} -> ${newState}`, {
      metrics: this.getMetrics(),
    });

    this.config.onStateChange(oldState, newState);
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics.failures = 0;
    this.metrics.successes = 0;
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveSuccesses = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): CircuitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealth(): {
    state: CircuitState;
    healthy: boolean;
    failureRate: number;
    metrics: CircuitMetrics;
  } {
    const failureRate =
      this.metrics.totalRequests > 0
        ? this.metrics.totalFailures / this.metrics.totalRequests
        : 0;

    return {
      state: this.state,
      healthy: this.state === "CLOSED",
      failureRate,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.transitionTo("OPEN");
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.transitionTo("CLOSED");
    this.resetMetrics();
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = "CLOSED";
    this.metrics = {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
  }
}

// =====================================================
// CIRCUIT BREAKER REGISTRY
// =====================================================

class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, ReturnType<CircuitBreaker["getHealth"]>> {
    const status: Record<string, ReturnType<CircuitBreaker["getHealth"]>> = {};

    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getHealth();
    });

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): void {
    this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Decorator for circuit breaker protection
 */
export function WithCircuitBreaker(
  name: string,
  config?: CircuitBreakerConfig,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const breaker = circuitBreakerRegistry.get(name, config);

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Helper function to execute with circuit breaker
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config?: CircuitBreakerConfig,
): Promise<T> {
  const breaker = circuitBreakerRegistry.get(name, config);
  return breaker.execute(fn);
}
