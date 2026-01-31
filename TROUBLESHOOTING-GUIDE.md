# 🔧 TROUBLESHOOTING GUIDE

**OptimusVet - Error Management & Debugging**

## 📋 Common Issues & Solutions

### 1. TypeScript Errors

#### Issue: `Module has no exported member`

**Symptoms:**

```
Module '@prisma/client' has no exported member 'AuditAction'
```

**Solution:**

```bash
# Regenerate Prisma Client
npx prisma generate

# If still failing, check schema.prisma for the enum
# Make sure AuditAction enum exists
```

#### Issue: `Property does not exist on type`

**Symptoms:**

```
Property 'auditLog' does not exist on type 'PrismaClient'
```

**Solution:**

```bash
# 1. Check if model exists in schema.prisma
# 2. Regenerate Prisma Client
npx prisma generate

# 3. Restart TypeScript server in VS Code
# Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

#### Issue: `Could not find declaration file for module`

**Symptoms:**

```
Could not find a declaration file for module 'lru-cache'
```

**Solution:**

```bash
# Install type definitions
npm install --save-dev @types/lru-cache

# Or for other packages
npm install --save-dev @types/[package-name]
```

---

### 2. Database Errors

#### Issue: Database Connection Failed

**Symptoms:**

```
DATABASE_CONNECTION_ERROR: Could not connect to database
```

**Solution:**

```bash
# 1. Check DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# 2. Test connection
npx prisma db pull

# 3. Check if PostgreSQL is running
# Windows: Check Services
# Linux/Mac: sudo systemctl status postgresql
```

#### Issue: Prisma Migration Failed

**Symptoms:**

```
Migration failed: P2002 Unique constraint violation
```

**Solution:**

```bash
# 1. Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# 2. Or manually fix the conflict
# 3. Then run migration
npx prisma migrate dev
```

---

### 3. API Errors

#### Issue: 401 Unauthorized

**Symptoms:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Kimlik doğrulama gerekli"
  }
}
```

**Solution:**

```typescript
// 1. Check if user is logged in
const session = await auth();
console.log(session);

// 2. Check if auth middleware is applied
export const GET = createProtectedApiRoute(handler);

// 3. Check if session is valid
// Clear cookies and login again
```

#### Issue: 429 Rate Limited

**Symptoms:**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Çok fazla istek gönderdiniz"
  }
}
```

**Solution:**

```typescript
// 1. Wait for the retry-after period
// Check response headers: Retry-After

// 2. Increase rate limit (if needed)
export const POST = withRateLimit(handler, {
  maxRequests: 30, // Increase from 10
  interval: 60000,
});

// 3. Clear rate limit (admin only)
import { clearRateLimit } from "@/lib/rate-limit";
clearRateLimit("client-ip-address");
```

#### Issue: 503 Service Unavailable

**Symptoms:**

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Circuit breaker is OPEN"
  }
}
```

**Solution:**

```typescript
// 1. Check circuit breaker status
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
const status = circuitBreakerRegistry.getHealthStatus();
console.log(status);

// 2. Wait for automatic recovery (default: 60 seconds)

// 3. Manually reset circuit breaker (if needed)
const breaker = circuitBreakerRegistry.get("service-name");
breaker.reset();
```

---

### 4. Performance Issues

#### Issue: Slow API Response

**Symptoms:**

- API takes > 5 seconds to respond
- Timeout errors

**Solution:**

```typescript
// 1. Check database queries
// Use EXPLAIN ANALYZE
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM customers WHERE name LIKE '%search%'
`;

// 2. Add indexes
// In schema.prisma:
model Customer {
  // ...
  @@index([name])
  @@index([email])
}

// 3. Use pagination
const customers = await prisma.customer.findMany({
  take: 50,
  skip: (page - 1) * 50,
});

// 4. Add caching
import { LRUCache } from "lru-cache";
const cache = new LRUCache({ max: 100, ttl: 60000 });
```

#### Issue: Memory Leak

**Symptoms:**

- Memory usage keeps increasing
- Server crashes with "Out of Memory"

**Solution:**

```typescript
// 1. Check health endpoint
GET /api/health
// Look at memory.percentage

// 2. Find memory leaks
// Use Node.js --inspect flag
node --inspect server.js

// 3. Common causes:
// - Event listeners not removed
// - Large objects in closures
// - Circular references

// 4. Fix example:
// ❌ BAD
const listeners = [];
function addListener() {
  listeners.push(() => {});
}

// ✅ GOOD
function addListener() {
  const listener = () => {};
  emitter.on("event", listener);
  // Remove when done
  emitter.off("event", listener);
}
```

---

### 5. Error Handling Issues

#### Issue: Errors Not Caught

**Symptoms:**

- Unhandled promise rejection
- Server crashes

**Solution:**

```typescript
// 1. Always use try-catch in async functions
export const POST = createProtectedApiRoute(async (request, context) => {
  try {
    // Your logic
  } catch (error) {
    // Error is automatically handled by middleware
    throw error;
  }
});

// 2. Use error boundaries in React
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// 3. Add global error handlers
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
```

#### Issue: Error Messages Not User-Friendly

**Symptoms:**

- Technical error messages shown to users
- Stack traces visible

**Solution:**

```typescript
// 1. Use custom error classes
throw new ValidationError("Email is required");
// Instead of: throw new Error("email field is missing");

// 2. Check NODE_ENV
if (process.env.NODE_ENV === "production") {
  // Hide technical details
  return { message: "An error occurred" };
} else {
  // Show details in development
  return { message: error.message, stack: error.stack };
}

// 3. Use error handler
import { createErrorResponse } from "@/lib/error-handler";
return createErrorResponse(error);
```

---

### 6. Circuit Breaker Issues

#### Issue: Circuit Breaker Always Open

**Symptoms:**

- All requests fail with "Circuit breaker is OPEN"
- Service never recovers

**Solution:**

```typescript
// 1. Check failure threshold
const breaker = new CircuitBreaker("service", {
  failureThreshold: 5, // Increase if too sensitive
  timeout: 60000, // Increase recovery time
});

// 2. Check if service is actually down
// Test service directly

// 3. Manually close circuit breaker
breaker.close();

// 4. Check metrics
const health = breaker.getHealth();
console.log(health);
```

---

### 7. Retry Logic Issues

#### Issue: Infinite Retry Loop

**Symptoms:**

- Request never completes
- Logs show continuous retries

**Solution:**

```typescript
// 1. Set max retries
await withRetry(fn, {
  maxRetries: 3, // Don't retry forever
});

// 2. Check if error is retryable
import { isRetryableError } from "@/lib/retry";
if (!isRetryableError(error)) {
  throw error; // Don't retry
}

// 3. Add timeout
await withRetryAndTimeout(fn, 5000, { maxRetries: 3 });
```

---

## 🔍 Debugging Tools

### 1. Health Check

```bash
# Check system health
curl http://localhost:3002/api/health

# Response shows:
# - Database status
# - Memory usage
# - Uptime
# - Circuit breaker status
```

### 2. Circuit Breaker Status

```typescript
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";

// Get all circuit breakers
const status = circuitBreakerRegistry.getHealthStatus();
console.log(JSON.stringify(status, null, 2));

// Get specific breaker
const breaker = circuitBreakerRegistry.get("service-name");
console.log(breaker.getMetrics());
```

### 3. Error Logs

```typescript
import { getErrorStats } from "@/lib/error-logger";

// Get error statistics
const stats = await getErrorStats("day");
console.log(stats);
```

### 4. Rate Limit Stats

```typescript
import { getRateLimitStats } from "@/lib/rate-limit";

const stats = getRateLimitStats();
console.log(stats);
```

---

## 🛠️ Development Tools

### 1. TypeScript Diagnostics

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### 2. Prisma Studio

```bash
# Open database GUI
npx prisma studio

# Access at: http://localhost:5555
```

### 3. Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (CAUTION)
npx prisma migrate reset
```

### 4. Logs

```bash
# View application logs
npm run dev

# View with timestamps
npm run dev | ts-node

# Filter errors only
npm run dev 2>&1 | grep ERROR
```

---

## 📊 Monitoring

### 1. Health Monitoring

```bash
# Continuous health check
watch -n 5 'curl -s http://localhost:3002/api/health | jq'
```

### 2. Memory Monitoring

```bash
# Check Node.js memory
node --expose-gc --max-old-space-size=4096 server.js
```

### 3. Performance Monitoring

```typescript
// Add timing logs
console.time("operation");
await operation();
console.timeEnd("operation");
```

---

## 🚨 Emergency Procedures

### 1. System Down

```bash
# 1. Check health endpoint
curl http://localhost:3002/api/health

# 2. Check database
npx prisma db pull

# 3. Check logs
tail -f logs/error.log

# 4. Restart server
npm run dev
```

### 2. Database Issues

```bash
# 1. Backup database
pg_dump dbname > backup.sql

# 2. Reset migrations
npx prisma migrate reset

# 3. Restore backup
psql dbname < backup.sql
```

### 3. Memory Issues

```bash
# 1. Restart server
pm2 restart app

# 2. Increase memory limit
node --max-old-space-size=4096 server.js

# 3. Clear caches
# Restart Redis/Memcached
```

---

## 📞 Support

If issues persist:

1. Check [ERROR-MANAGEMENT-SYSTEM.md](./ERROR-MANAGEMENT-SYSTEM.md)
2. Review error logs
3. Check health endpoint
4. Contact development team

---

**Last Updated:** 2025-01-01
