/**
 * EXAMPLE API ROUTE
 *
 * Demonstrates the complete error management system:
 * - Error handling
 * - Rate limiting
 * - Authentication
 * - Validation
 * - Retry logic
 * - Circuit breaker
 * - Logging
 */

import { NextRequest } from "next/server";
import {
  createProtectedApiRoute,
  successResponse,
  withValidation,
} from "@/lib/api-middleware";
import { withRetry } from "@/lib/retry";
import { withCircuitBreaker } from "@/lib/circuit-breaker";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError, NotFoundError } from "@/lib/error-handler";

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const createExampleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(0).max(150).optional(),
});

type CreateExampleInput = z.infer<typeof createExampleSchema>;

// =====================================================
// API ROUTES
// =====================================================

/**
 * GET /api/example
 *
 * Example: Protected route with error handling
 */
export const GET = createProtectedApiRoute(async (request, context) => {
  // Example: Query with retry logic
  const users = await withRetry(
    async () => {
      return await prisma.user.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        take: 10,
      });
    },
    {
      maxRetries: 3,
      delay: 1000,
    },
  );

  return successResponse(users, {
    count: users.length,
    userId: context.user?.id,
  });
});

/**
 * POST /api/example
 *
 * Example: Protected route with validation
 */
export const POST = createProtectedApiRoute(
  withValidation(createExampleSchema)(async (request, context, data) => {
    // Validate business logic
    if (data.age && data.age < 18) {
      throw new ValidationError("Age must be 18 or older");
    }

    // Example: Create with circuit breaker protection
    const result = await withCircuitBreaker(
      "database-write",
      async () => {
        // Simulate database operation
        return {
          id: "example_123",
          ...data,
          createdBy: context.user?.id,
          createdAt: new Date().toISOString(),
        };
      },
      {
        failureThreshold: 5,
        timeout: 60000,
      },
    );

    return successResponse(result, {
      message: "Created successfully",
    });
  }),
);

/**
 * GET /api/example/:id
 *
 * Example: Get single resource with error handling
 */
export async function GET_BY_ID(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return createProtectedApiRoute(async (request, context) => {
    const { id } = params;

    // Example: Find with retry
    const user = await withRetry(async () => {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return successResponse(user);
  })(request);
}

/**
 * DELETE /api/example/:id
 *
 * Example: Admin-only route
 */
export async function DELETE_BY_ID(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return createProtectedApiRoute(async (request, context) => {
    // Check admin role
    if (context.user?.role !== "ADMIN") {
      throw new ValidationError("Only admins can delete users");
    }

    const { id } = params;

    // Example: Delete with circuit breaker
    await withCircuitBreaker("database-delete", async () => {
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });
    });

    return successResponse({ deleted: true, id });
  })(request);
}

/**
 * Example: Simulated external API call with full error management
 */
async function callExternalApi(endpoint: string): Promise<any> {
  return withCircuitBreaker(
    `external-api-${endpoint}`,
    async () => {
      return withRetry(
        async () => {
          const response = await fetch(`https://api.example.com/${endpoint}`, {
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          return response.json();
        },
        {
          maxRetries: 3,
          delay: 1000,
          backoff: 2,
        },
      );
    },
    {
      failureThreshold: 5,
      timeout: 60000,
    },
  );
}
