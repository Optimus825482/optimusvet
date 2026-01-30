import { NextResponse, type NextRequest } from "next/server";

// Simple in-memory rate limiter (for development)
// For production, use @upstash/ratelimit with Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Get client IP for rate limiting
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Apply rate limiting to API routes
  if (nextUrl.pathname.startsWith("/api/")) {
    if (!rateLimit(ip, 100, 60000)) {
      // 100 requests per minute
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Çok fazla istek. Lütfen daha sonra tekrar deneyin.",
          },
        },
        { status: 429 },
      );
    }
  }

  // Public routes - allow without auth check
  const isPublicRoute =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/auth") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/health");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, auth will be checked in the route handlers
  // This avoids edge runtime issues with NextAuth
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|service-worker.js|sw.js|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
