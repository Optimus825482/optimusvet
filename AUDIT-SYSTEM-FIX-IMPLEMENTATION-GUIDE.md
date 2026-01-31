# 🔧 AUDIT SYSTEM - FIX IMPLEMENTATION GUIDE

**Proje:** OptimusVet - Audit Log System  
**Tarih:** 2024  
**Versiyon:** 1.0

Bu guide, tespit edilen tüm güvenlik açıklarını ve hataları düzeltmek için adım adım talimatlar içerir.

---

## 📦 REQUIRED DEPENDENCIES

Öncelikle gerekli paketleri yükleyin:

```bash
# Validation
npm install zod

# Rate Limiting
npm install lru-cache

# Error Handling
npm install react-error-boundary

# Safe JSON (optional, custom implementation provided)
npm install json-stringify-safe

# Retry Logic (optional)
npm install p-retry

# Type definitions
npm install -D @types/json-stringify-safe
```

---

## 🚀 PHASE 1: CRITICAL FIXES (4 hours)

### 1.1 Add Validation Schemas (2 hours)

**File:** `src/lib/audit-validation.ts` (ALREADY CREATED ✅)

**Action:** Copy the file from the improved version.

**Verification:**

```typescript
import { validateAuditLogQuery } from "@/lib/audit-validation";

// Test validation
const result = validateAuditLogQuery({
  page: "1",
  limit: "50",
  tableName: "users",
});

console.log(result); // Should pass
```

---

### 1.2 Add Error Boundary (30 minutes)

**File:** `src/components/error-boundary.tsx` (ALREADY CREATED ✅)

**Action:** Copy the file from the improved version.

**Usage in Layout:**

```typescript
// src/app/dashboard/layout.tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

**Verification:**

```typescript
// Test error boundary
function TestComponent() {
  throw new Error("Test error");
  return <div>Test</div>;
}

<ErrorBoundary>
  <TestComponent />
</ErrorBoundary>
// Should show error UI instead of crashing
```

---

### 1.3 Add Rate Limiting (1 hour)

**File:** `src/lib/rate-limit.ts` (ALREADY CREATED ✅)

**Action:** Copy the file from the improved version.

**Usage in API Routes:**

```typescript
// src/app/api/audit-logs/route.ts
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit";

async function handler(request: NextRequest) {
  // Your existing code
}

export const GET = withRateLimit(handler, RateLimitPresets.STANDARD);
```

**Verification:**

```bash
# Test rate limiting
for i in {1..15}; do
  curl http://localhost:3000/api/audit-logs
done
# Should return 429 after 10 requests
```

---

### 1.4 Fix Circular Reference in audit.ts (30 minutes)

**File:** `src/lib/audit.ts`

**Action:** Replace the `detectChanges` function with the improved version (ALREADY DONE ✅)

**Verification:**

```typescript
// Test circular reference handling
const obj: any = { name: "test" };
obj.self = obj; // Circular reference

const changes = detectChanges({}, { data: obj });
// Should not crash
```

---

## 🔴 PHASE 2: HIGH PRIORITY FIXES (5.5 hours)

### 2.1 Update API Routes with Validation (2 hours)

**Files to Update:**

- `src/app/api/audit-logs/route.ts`
- `src/app/api/audit-logs/[id]/route.ts`
- `src/app/api/audit-logs/stats/route.ts`
- `src/app/api/audit-logs/cleanup/route.ts`

**Template (use for all routes):**

```typescript
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit";
import { validateAuditLogQuery } from "@/lib/audit-validation";
import { ZodError } from "zod";

async function handler(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin yetkisi gerekli" },
        },
        { status: 403 },
      );
    }

    // 2. Validate input
    let validated;
    try {
      const searchParams = request.nextUrl.searchParams;
      validated = validateAuditLogQuery({
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        // ... other params
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Geçersiz parametreler",
              details:
                process.env.NODE_ENV === "development"
                  ? error.errors
                  : undefined,
            },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // 3. Your existing logic (use validated params)
    const logs = await prisma.auditLog.findMany({
      where: { tableName: validated.tableName },
      skip: (validated.page - 1) * validated.limit,
      take: validated.limit,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("[API ERROR]", error);

    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Bir hata oluştu",
          ...(isDev && {
            details: error instanceof Error ? error.message : String(error),
          }),
        },
      },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handler, RateLimitPresets.STANDARD);
```

**Verification:**

```bash
# Test validation
curl "http://localhost:3000/api/audit-logs?page=abc" # Should return 400
curl "http://localhost:3000/api/audit-logs?limit=999999" # Should be capped at 100
curl "http://localhost:3000/api/audit-logs?tableName=invalid" # Should return 400
```

---

### 2.2 Add Promise Rejection Handlers (1 hour)

**File:** `src/lib/audit.ts`

**Action:** Update `createAuditLog` function:

```typescript
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Validate entry
    const validated = validateAuditLogEntry(entry);

    // Sanitize data
    const sanitizedOldValues = validated.oldValues
      ? sanitizeData(validated.oldValues)
      : undefined;
    const sanitizedNewValues = validated.newValues
      ? sanitizeData(validated.newValues)
      : undefined;

    // Validate JSON depth (prevent DoS)
    if (sanitizedOldValues) {
      validateJSONDepth(sanitizedOldValues);
    }
    if (sanitizedNewValues) {
      validateJSONDepth(sanitizedNewValues);
    }

    // Save to database with retry
    await withRetry(() =>
      prisma.auditLog.create({
        data: {
          action: validated.action,
          tableName: validated.tableName,
          recordId: validated.recordId,
          oldValues: sanitizedOldValues,
          newValues: sanitizedNewValues,
          changedFields: validated.changedFields || [],
          userId: validated.context?.userId,
          userEmail: validated.context?.userEmail,
          userName: validated.context?.userName,
          ipAddress: validated.context?.ipAddress,
          userAgent: validated.context?.userAgent,
          requestPath: validated.context?.requestPath,
          requestMethod: validated.context?.requestMethod,
        },
      }),
    );
  } catch (error) {
    // Audit logging ASLA ana işlemi etkilememeli
    console.error("[AUDIT LOG ERROR]", error);

    // TODO: Store failed audits in dead-letter queue
    // await storeFailedAudit(entry, error);
  }
}

// Helper: Retry wrapper
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Retry attempt ${i + 1}/${retries}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw lastError;
}
```

---

### 2.3 Fix Memory Leaks in Frontend (30 minutes)

**File:** `src/app/dashboard/audit-logs/page.tsx`

**Action:** Add useEffect cleanup:

```typescript
// Add cleanup for any intervals, subscriptions, etc.
useEffect(() => {
  // If you have polling
  const interval = setInterval(() => {
    refetch();
  }, 30000);

  return () => {
    clearInterval(interval); // Cleanup on unmount
  };
}, [refetch]);

// Add cleanup for CSV export
const handleExport = () => {
  if (!data?.data) return;

  try {
    const csv = generateCSV(data.data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();

    // IMPORTANT: Cleanup blob URL
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("[EXPORT ERROR]", error);
  }
};
```

---

### 2.4 Add Database Connection Retry (1 hour)

**File:** `src/lib/prisma.ts`

**Action:** Update Prisma client initialization:

```typescript
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

// Add connection retry wrapper
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Database operation failed. Attempt ${i + 1}/${retries}`,
        error,
      );

      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
  }

  throw lastError;
}

// Usage:
// await withDatabaseRetry(() => prisma.auditLog.create({ data }));
```

---

## 🟡 PHASE 3: MEDIUM PRIORITY FIXES (3.25 hours)

### 3.1 Hide Error Details in Production (30 minutes)

**Action:** Already implemented in Phase 2.1 ✅

---

### 3.2 Add Pagination Validation (15 minutes)

**Action:** Already implemented in validation schemas ✅

---

### 3.3 Replace 'any' Types (1 hour)

**Files to Update:**

- `src/lib/audit.ts`
- `src/app/api/audit-logs/route.ts`
- `src/components/audit/*.tsx`

**Action:** Replace `any` with proper types:

```typescript
// ❌ Before
const where: any = {};
oldValues: any;

// ✅ After
import { Prisma } from "@prisma/client";

const where: Prisma.AuditLogWhereInput = {};
oldValues: Record<string, unknown>;
```

---

### 3.4 Add Structured Logging (1 hour)

**File:** `src/lib/logger.ts` (NEW)

```typescript
/**
 * STRUCTURED LOGGING
 *
 * Provides consistent logging across the application
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In development, use console
    if (process.env.NODE_ENV === "development") {
      console[level === "debug" ? "log" : level](
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        context || "",
      );
    } else {
      // In production, send to logging service (e.g., Winston, Pino, DataDog)
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }
}

export const logger = new Logger();
```

**Usage:**

```typescript
// Replace console.error with logger.error
logger.error("Audit log creation failed", {
  error: error.message,
  stack: error.stack,
  context: {
    tableName,
    recordId,
    userId: context?.userId,
  },
});
```

---

### 3.5 Add Health Check Endpoint (30 minutes)

**File:** `src/app/api/health/route.ts` (NEW)

```typescript
/**
 * HEALTH CHECK ENDPOINT
 *
 * GET /api/health
 * - Check database connection
 * - Check API status
 * - Return health status
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "up",
        api: "up",
      },
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    console.error("[HEALTH CHECK ERROR]", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "down",
          api: "up",
        },
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 503 },
    );
  }
}
```

**Verification:**

```bash
curl http://localhost:3000/api/health
# Should return { "status": "healthy", ... }
```

---

## 🧪 PHASE 4: TESTING (2 hours)

### 4.1 Unit Tests

**File:** `src/lib/__tests__/audit-validation.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  validateAuditLogQuery,
  validateAuditLogEntry,
  safeStringify,
  safeCompare,
} from "../audit-validation";

describe("Audit Validation", () => {
  describe("validateAuditLogQuery", () => {
    it("should validate valid query", () => {
      const result = validateAuditLogQuery({
        page: "1",
        limit: "50",
        tableName: "users",
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.tableName).toBe("users");
    });

    it("should reject invalid page", () => {
      expect(() => validateAuditLogQuery({ page: "abc" })).toThrow();
    });

    it("should cap limit at 100", () => {
      const result = validateAuditLogQuery({ limit: "999999" });
      expect(result.limit).toBeLessThanOrEqual(100);
    });

    it("should reject invalid table name", () => {
      expect(() =>
        validateAuditLogQuery({ tableName: "invalid_table" }),
      ).toThrow();
    });
  });

  describe("safeStringify", () => {
    it("should handle circular references", () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      const result = safeStringify(obj);
      expect(result).toContain("[Circular Reference]");
    });

    it("should handle BigInt", () => {
      const obj = { id: BigInt(123) };
      const result = safeStringify(obj);
      expect(result).toContain("123");
    });
  });

  describe("safeCompare", () => {
    it("should compare simple objects", () => {
      const obj1 = { name: "test" };
      const obj2 = { name: "test" };
      expect(safeCompare(obj1, obj2)).toBe(true);
    });

    it("should handle circular references", () => {
      const obj1: any = { name: "test" };
      obj1.self = obj1;

      const obj2: any = { name: "test" };
      obj2.self = obj2;

      expect(() => safeCompare(obj1, obj2)).not.toThrow();
    });
  });
});
```

**Run tests:**

```bash
npm run test
```

---

### 4.2 Integration Tests

**File:** `src/app/api/audit-logs/__tests__/route.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

describe("Audit Logs API", () => {
  it("should return 403 for non-admin users", async () => {
    const request = new NextRequest("http://localhost:3000/api/audit-logs");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
  });

  it("should validate query parameters", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/audit-logs?page=abc",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return audit logs for admin", async () => {
    // TODO: Mock admin session
    // const response = await GET(request);
    // expect(response.status).toBe(200);
  });
});
```

---

### 4.3 E2E Tests

**File:** `e2e/audit-logs.spec.ts` (NEW)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Audit Logs Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password");
    await page.click('button[type="submit"]');
  });

  test("should display audit logs", async ({ page }) => {
    await page.goto("/dashboard/audit-logs");
    await expect(page.locator("h1")).toContainText("Audit Logları");
  });

  test("should filter audit logs", async ({ page }) => {
    await page.goto("/dashboard/audit-logs");
    await page.click('button:has-text("Göster")'); // Expand filters
    await page.selectOption('select[name="tableName"]', "users");
    await expect(page.locator("table")).toBeVisible();
  });

  test("should export to CSV", async ({ page }) => {
    await page.goto("/dashboard/audit-logs");
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Dışa Aktar")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("audit-logs");
  });

  test("should handle errors gracefully", async ({ page }) => {
    // Simulate error
    await page.route("**/api/audit-logs", (route) =>
      route.fulfill({ status: 500 }),
    );
    await page.goto("/dashboard/audit-logs");
    await expect(page.locator("text=hata oluştu")).toBeVisible();
  });
});
```

**Run E2E tests:**

```bash
npx playwright test
```

---

## 📚 PHASE 5: DOCUMENTATION (1 hour)

### 5.1 API Documentation

**File:** `docs/api/audit-logs.md` (NEW)

````markdown
# Audit Logs API Documentation

## Endpoints

### GET /api/audit-logs

List all audit logs with filtering and pagination.

**Authentication:** Admin only

**Query Parameters:**

- `page` (number, optional): Page number (default: 1, min: 1, max: 10000)
- `limit` (number, optional): Items per page (default: 50, min: 1, max: 100)
- `tableName` (string, optional): Filter by table name
- `action` (string, optional): Filter by action (CREATE, UPDATE, DELETE, READ)
- `userId` (string, optional): Filter by user ID
- `recordId` (string, optional): Filter by record ID
- `dateFrom` (string, optional): Filter by start date (ISO 8601)
- `dateTo` (string, optional): Filter by end date (ISO 8601)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "action": "CREATE",
      "tableName": "users",
      "recordId": "clx...",
      "oldValues": null,
      "newValues": { "name": "John Doe", "email": "john@example.com" },
      "changedFields": [],
      "userId": "clx...",
      "userEmail": "admin@example.com",
      "userName": "Admin",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "requestPath": "/api/users",
      "requestMethod": "POST",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```
````

**Error Responses:**

- `400 Bad Request`: Invalid query parameters
- `403 Forbidden`: Not admin
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limit:** 10 requests per minute per IP

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/audit-logs?page=1&limit=50&tableName=users"
```

````

---

### 5.2 Developer Guide

**File:** `docs/DEVELOPER-GUIDE.md` (NEW)

```markdown
# Audit System Developer Guide

## Setup

1. Install dependencies:
```bash
npm install
````

2. Run database migrations:

```bash
npx prisma migrate dev
```

3. Start development server:

```bash
npm run dev
```

## Usage

### Adding Audit Logs

```typescript
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { getAuditContext } from "@/lib/audit-context";

// In API route
export async function POST(request: NextRequest) {
  const context = await getAuditContext(request);

  // Create user
  const user = await prisma.user.create({ data });

  // Audit log
  await auditCreate("users", user.id, user, context);

  return NextResponse.json({ success: true, data: user });
}
```

### Custom Validation

```typescript
import { z } from "zod";

const CustomSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const validated = CustomSchema.parse(data);
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npx playwright test

# Coverage
npm run test:coverage
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md)

````

---

## ✅ VERIFICATION CHECKLIST

After implementing all fixes, verify:

- [ ] All dependencies installed
- [ ] All files created/updated
- [ ] Rate limiting works (test with curl)
- [ ] Error boundaries catch errors
- [ ] Validation rejects invalid input
- [ ] Circular references handled
- [ ] Memory leaks fixed (check with React DevTools Profiler)
- [ ] Database connection retry works
- [ ] Health check endpoint works
- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] API response time <200ms
- [ ] Documentation complete

---

## 🚀 DEPLOYMENT

### Pre-deployment Checklist

- [ ] All critical & high priority fixes implemented
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Rollback plan prepared

### Deployment Steps

1. **Backup database:**
```bash
pg_dump -U postgres -d optimusvet > backup_$(date +%Y%m%d).sql
````

2. **Run migrations:**

```bash
npx prisma migrate deploy
```

3. **Build application:**

```bash
npm run build
```

4. **Start production server:**

```bash
npm run start
```

5. **Verify health:**

```bash
curl https://your-domain.com/api/health
```

6. **Monitor logs:**

```bash
tail -f /var/log/optimusvet/app.log
```

---

## 📞 SUPPORT

For questions or issues:

- Email: dev@optimusvet.com
- Slack: #audit-system
- Documentation: https://docs.optimusvet.com

---

**Last Updated:** 2024  
**Version:** 1.0
