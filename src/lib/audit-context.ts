/**
 * AUDIT CONTEXT MIDDLEWARE
 *
 * Request context'i yakalar ve audit log'a ekler:
 * - User bilgileri (session'dan)
 * - IP address
 * - User agent
 * - Request path & method
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import type { AuditContext } from "./audit";

/**
 * Request'ten IP address çıkar
 */
export function getClientIp(request: NextRequest): string | undefined {
  // Cloudflare, Vercel, nginx gibi proxy'ler için
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback
  return request.headers.get("x-client-ip") || undefined;
}

/**
 * Request'ten audit context oluştur
 */
export async function createAuditContext(
  request: NextRequest,
): Promise<AuditContext> {
  // Session'dan user bilgilerini al
  const session = await auth();

  return {
    userId: session?.user?.id,
    userEmail: session?.user?.email || undefined,
    userName: session?.user?.name || undefined,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    requestPath: request.nextUrl.pathname,
    requestMethod: request.method,
  };
}

/**
 * API Route handler'lar için audit context wrapper
 *
 * Kullanım:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const context = await getAuditContext(request);
 *   // ... işlemler ...
 *   await auditCreate('customers', customer.id, customer, context);
 * }
 * ```
 */
export async function getAuditContext(
  request: NextRequest,
): Promise<AuditContext> {
  return createAuditContext(request);
}

/**
 * Server Action'lar için audit context
 * (Server Action'larda NextRequest yok, headers() kullanılır)
 */
export async function getServerActionAuditContext(): Promise<AuditContext> {
  const session = await auth();

  // Server Action'larda headers() ile IP alınabilir
  // Ancak Next.js 14'te bu sınırlı, en azından user bilgilerini kaydedelim
  return {
    userId: session?.user?.id,
    userEmail: session?.user?.email || undefined,
    userName: session?.user?.name || undefined,
    requestMethod: "SERVER_ACTION",
  };
}
