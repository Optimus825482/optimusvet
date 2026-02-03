/**
 * AUDIT API HELPER
 *
 * API route'larda audit context'i kolayca set etmek için helper fonksiyonlar
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { setAuditContext, clearAuditContext } from "./prisma-audit-middleware";

/**
 * API route için audit context'i otomatik set et
 *
 * Middleware otomatik olarak action'ı belirler (CREATE/UPDATE/DELETE)
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withAuditContext(request, async () => {
 *     // Your code here - audit context is set
 *     const customer = await prisma.customer.create({ ... });
 *     return NextResponse.json(customer);
 *   });
 * }
 * ```
 */
export async function withAuditContext<T>(
  request: NextRequest,
  handler: () => Promise<T>,
): Promise<T> {
  try {
    // Session'dan user bilgisini al
    const session = await auth();

    if (session?.user) {
      // IP ve User Agent bilgilerini al
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const userAgent = request.headers.get("user-agent") || "unknown";

      // Audit context'i set et
      setAuditContext({
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        ipAddress,
        userAgent,
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
      });
    }

    // Handler'ı çalıştır
    const result = await handler();

    return result;
  } finally {
    // Her durumda context'i temizle
    clearAuditContext();
  }
}

/**
 * Sadece audit context'i set et (manuel cleanup için)
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   try {
 *     await setAuditContextFromRequest(request);
 *     // Your code here
 *   } finally {
 *     clearAuditContext();
 *   }
 * }
 * ```
 */
export async function setAuditContextFromRequest(
  request: NextRequest,
): Promise<void> {
  const session = await auth();

  if (session?.user) {
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    setAuditContext({
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      ipAddress,
      userAgent,
      requestPath: request.nextUrl.pathname,
      requestMethod: request.method,
    });
  }
}
