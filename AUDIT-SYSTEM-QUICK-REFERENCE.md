# 🚀 AUDIT SYSTEM - QUICK REFERENCE CARD

**One-page reference for developers**

---

## 📦 FILES CREATED/MODIFIED

### ✅ NEW FILES (Copy these)

```
src/lib/audit-validation.ts          # Validation schemas
src/lib/rate-limit.ts                 # Rate limiting
src/lib/logger.ts                     # Structured logging
src/components/error-boundary.tsx     # Error boundaries
src/app/api/health/route.ts           # Health check
```

### 🔧 MODIFIED FILES (Update these)

```
src/lib/audit.ts                      # Fix circular references
src/lib/prisma.ts                     # Add retry logic
src/app/api/audit-logs/route.ts       # Add validation + rate limit
src/app/dashboard/audit-logs/page.tsx # Add error boundary + cleanup
```

---

## 🔥 CRITICAL FIXES (Must Do)

### 1. Rate Limiting

```typescript
// src/app/api/audit-logs/route.ts
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit";

async function handler(request: NextRequest) {
  /* ... */
}

export const GET = withRateLimit(handler, RateLimitPresets.STANDARD);
```

### 2. Error Boundary

```typescript
// src/app/dashboard/layout.tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function Layout({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

### 3. Input Validation

```typescript
// src/app/api/audit-logs/route.ts
import { validateAuditLogQuery } from "@/lib/audit-validation";

const validated = validateAuditLogQuery({
  page: searchParams.get("page"),
  limit: searchParams.get("limit"),
});
```

### 4. Circular Reference Fix

```typescript
// src/lib/audit.ts
// Already fixed in detectChanges() function
// Uses safeStringify() instead of JSON.stringify()
```

---

## 🛠️ COMMON PATTERNS

### API Route Template

```typescript
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit";
import { validateAuditLogQuery } from "@/lib/audit-validation";
import { ZodError } from "zod";

async function handler(request: NextRequest) {
  try {
    // 1. Auth
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

    // 2. Validate
    let validated;
    try {
      validated = validateAuditLogQuery({
        /* params */
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Geçersiz parametreler",
            },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // 3. Logic
    const data = await prisma.auditLog.findMany({
      /* ... */
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Bir hata oluştu" },
      },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handler, RateLimitPresets.STANDARD);
```

### Component Template

```typescript
import { ErrorBoundary, MinimalErrorFallback } from "@/components/error-boundary";

function MyComponent() {
  // Add cleanup
  useEffect(() => {
    const interval = setInterval(() => { /* ... */ }, 1000);
    return () => clearInterval(interval); // Cleanup!
  }, []);

  return <div>Content</div>;
}

export default function Page() {
  return (
    <ErrorBoundary fallback={<MinimalErrorFallback />}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

## 🧪 TESTING COMMANDS

```bash
# Install dependencies
npm install zod lru-cache react-error-boundary

# Run tests
npm run test

# E2E tests
npx playwright test

# Test rate limiting
for i in {1..15}; do curl http://localhost:3000/api/audit-logs; done

# Test validation
curl "http://localhost:3000/api/audit-logs?page=abc"  # Should return 400

# Test health check
curl http://localhost:3000/api/health
```

---

## 📋 DEPLOYMENT CHECKLIST

```bash
# 1. Backup database
pg_dump -U postgres -d optimusvet > backup.sql

# 2. Run migrations
npx prisma migrate deploy

# 3. Build
npm run build

# 4. Start
npm run start

# 5. Verify
curl https://your-domain.com/api/health
```

---

## 🔍 DEBUGGING

### Check Rate Limit

```typescript
import { getRateLimitStats } from "@/lib/rate-limit";
console.log(getRateLimitStats());
```

### Check Error Boundary

```typescript
// Throw test error
function TestComponent() {
  throw new Error("Test error");
  return <div>Test</div>;
}
```

### Check Validation

```typescript
import { validateAuditLogQuery } from "@/lib/audit-validation";
try {
  validateAuditLogQuery({ page: "abc" });
} catch (error) {
  console.error(error); // Should show validation error
}
```

---

## 🚨 COMMON ERRORS & FIXES

### Error: "Too many requests"

**Cause:** Rate limit exceeded  
**Fix:** Wait 1 minute or increase limit in `RateLimitPresets`

### Error: "Validation error"

**Cause:** Invalid query parameters  
**Fix:** Check parameter types and ranges

### Error: "Circular reference"

**Cause:** Object has circular reference  
**Fix:** Already fixed with `safeStringify()`

### Error: "Memory leak detected"

**Cause:** Missing useEffect cleanup  
**Fix:** Add return cleanup function in useEffect

---

## 📊 PERFORMANCE TARGETS

- ✅ API response time: <200ms
- ✅ Database query time: <100ms
- ✅ Rate limit: 10 req/min (standard)
- ✅ Max pagination limit: 100
- ✅ Max JSON depth: 10 levels

---

## 🔗 USEFUL LINKS

- [Full Security Report](./AUDIT-SYSTEM-SECURITY-REPORT.md)
- [Implementation Guide](./AUDIT-SYSTEM-FIX-IMPLEMENTATION-GUIDE.md)
- [API Documentation](./docs/api/audit-logs.md)
- [Developer Guide](./docs/DEVELOPER-GUIDE.md)

---

## 💡 TIPS

1. **Always validate input** - Use Zod schemas
2. **Always add rate limiting** - Prevent abuse
3. **Always add error boundaries** - Prevent UI crashes
4. **Always cleanup useEffect** - Prevent memory leaks
5. **Always hide errors in production** - Security
6. **Always test edge cases** - Circular refs, null, undefined
7. **Always add retry logic** - Database resilience
8. **Always log structured** - Better debugging

---

**Last Updated:** 2024  
**Version:** 1.0  
**Status:** Production Ready ✅
