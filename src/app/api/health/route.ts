/**
 * HEALTH CHECK ENDPOINT
 *
 * Monitors system health:
 * - Database connectivity
 * - Memory usage
 * - Uptime
 * - Circuit breaker status
 * - Error rates
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";

// =====================================================
// HEALTH CHECK TYPES
// =====================================================

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: DatabaseHealth;
    memory: MemoryHealth;
    uptime: UptimeHealth;
    circuitBreakers?: CircuitBreakerHealth;
  };
  timestamp: string;
}

interface DatabaseHealth {
  status: "ok" | "error";
  latency?: number;
  error?: string;
}

interface MemoryHealth {
  status: "ok" | "warning" | "critical";
  used: number;
  total: number;
  percentage: number;
}

interface UptimeHealth {
  status: "ok";
  seconds: number;
  formatted: string;
}

interface CircuitBreakerHealth {
  status: "ok" | "degraded";
  breakers: Record<string, any>;
}

// =====================================================
// HEALTH CHECK FUNCTIONS
// =====================================================

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<DatabaseHealth> {
  try {
    const startTime = Date.now();

    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    return {
      status: "ok",
      latency,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): MemoryHealth {
  const usage = process.memoryUsage();
  const totalMemory = usage.heapTotal;
  const usedMemory = usage.heapUsed;
  const percentage = (usedMemory / totalMemory) * 100;

  let status: "ok" | "warning" | "critical" = "ok";

  if (percentage > 90) {
    status = "critical";
  } else if (percentage > 75) {
    status = "warning";
  }

  return {
    status,
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round(percentage),
  };
}

/**
 * Check uptime
 */
function checkUptime(): UptimeHealth {
  const uptimeSeconds = Math.floor(process.uptime());

  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const formatted = `${hours}h ${minutes}m ${seconds}s`;

  return {
    status: "ok",
    seconds: uptimeSeconds,
    formatted,
  };
}

/**
 * Check circuit breakers
 */
function checkCircuitBreakers(): CircuitBreakerHealth {
  const breakersStatus = circuitBreakerRegistry.getHealthStatus();
  const hasUnhealthy = Object.values(breakersStatus).some(
    (breaker) => !breaker.healthy,
  );

  return {
    status: hasUnhealthy ? "degraded" : "ok",
    breakers: breakersStatus,
  };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(
  checks: HealthCheck["checks"],
): HealthCheck["status"] {
  // Critical: Database is down
  if (checks.database.status === "error") {
    return "unhealthy";
  }

  // Critical: Memory is critical
  if (checks.memory.status === "critical") {
    return "unhealthy";
  }

  // Degraded: Memory warning or circuit breakers open
  if (
    checks.memory.status === "warning" ||
    checks.circuitBreakers?.status === "degraded"
  ) {
    return "degraded";
  }

  return "healthy";
}

// =====================================================
// API ROUTE
// =====================================================

/**
 * GET /api/health
 *
 * Returns system health status
 */
export async function GET() {
  try {
    // Run all health checks
    const [database, memory, uptime, circuitBreakers] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkUptime()),
      Promise.resolve(checkCircuitBreakers()),
    ]);

    const checks = {
      database,
      memory,
      uptime,
      circuitBreakers,
    };

    const status = determineOverallStatus(checks);

    const response: HealthCheck = {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };

    // Return appropriate HTTP status code
    const httpStatus =
      status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error("[HEALTH CHECK ERROR]", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        checks: {
          database: { status: "error", error: "Health check failed" },
          memory: { status: "critical", used: 0, total: 0, percentage: 0 },
          uptime: { status: "ok", seconds: 0, formatted: "0h 0m 0s" },
        },
        timestamp: new Date().toISOString(),
      } as HealthCheck,
      { status: 503 },
    );
  }
}

/**
 * HEAD /api/health
 *
 * Lightweight health check (no body)
 */
export async function HEAD() {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
