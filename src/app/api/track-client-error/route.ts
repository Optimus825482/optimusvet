/**
 * CLIENT ERROR TRACKING API
 *
 * Frontend'den gelen hataları takip etmek için endpoint.
 * Error boundary ve global error handler tarafından çağrılır.
 */

import { NextRequest, NextResponse } from "next/server";
import { trackError } from "@/lib/error-tracking";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await auth();

    const { message, stack, componentStack, url, userAgent } = body;

    // Client-side error'ları track et
    const errorId = await trackError({
      code: "CLIENT_ERROR",
      message: message || "Bilinmeyen hata",
      severity: "HIGH", // Client errors are HIGH severity
      stack: stack || componentStack,
      component: "Frontend",
      function: url || "Unknown",
      requestPath: url,
      requestMethod: "CLIENT",
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: userAgent || request.headers.get("user-agent") || "unknown",
      userId: session?.user?.id,
      userEmail: session?.user?.email || undefined,
      userName: session?.user?.name || undefined,
      context: {
        componentStack,
        url,
        timestamp: new Date().toISOString(),
      },
      isOperational: false,
      notifyAdmin: true, // Email gönder
    });

    return NextResponse.json({
      success: true,
      errorId,
      message: "Error tracked successfully",
    });
  } catch (error) {
    console.error("[CLIENT ERROR TRACKING] Failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track error" },
      { status: 500 },
    );
  }
}
