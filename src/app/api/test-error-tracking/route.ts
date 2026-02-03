/**
 * TEST ERROR TRACKING API
 *
 * Test endpoints for error tracking and email notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { trackError, getErrorStats } from "@/lib/error-tracking";
import { sendTestEmail, verifyEmailConfig } from "@/lib/email";

// =====================================================
// TEST ERROR TRACKING
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "test-error":
        return await testErrorTracking(request);

      case "test-email":
        return await testEmail();

      case "verify-email":
        return await testEmailConfig();

      case "get-stats":
        return await getStats();

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[TEST ERROR TRACKING] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Test error tracking
 */
async function testErrorTracking(request: NextRequest) {
  try {
    // Track a test error
    const errorId = await trackError({
      code: "TEST_ERROR",
      message: "Bu bir test hatasıdır",
      severity: "MEDIUM",
      component: "TestAPI",
      function: "testErrorTracking",
      context: {
        testData: "Test context data",
        timestamp: new Date().toISOString(),
      },
      requestPath: request.nextUrl.pathname,
      requestMethod: request.method,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      isOperational: true,
      notifyAdmin: false,
    });

    return NextResponse.json({
      success: true,
      message: "Test error tracked successfully",
      errorId,
    });
  } catch (error) {
    console.error("[TEST ERROR TRACKING] Failed:", error);
    return NextResponse.json(
      { error: "Failed to track test error" },
      { status: 500 },
    );
  }
}

/**
 * Test email sending
 */
async function testEmail() {
  try {
    const success = await sendTestEmail();

    return NextResponse.json({
      success,
      message: success
        ? "Test email sent successfully"
        : "Failed to send test email",
    });
  } catch (error) {
    console.error("[TEST EMAIL] Failed:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 },
    );
  }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  try {
    const isValid = await verifyEmailConfig();

    return NextResponse.json({
      success: isValid,
      message: isValid
        ? "Email configuration is valid"
        : "Email configuration is invalid",
    });
  } catch (error) {
    console.error("[TEST EMAIL CONFIG] Failed:", error);
    return NextResponse.json(
      { error: "Failed to verify email configuration" },
      { status: 500 },
    );
  }
}

/**
 * Get error statistics
 */
async function getStats() {
  try {
    const stats = await getErrorStats("day");

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[GET STATS] Failed:", error);
    return NextResponse.json(
      { error: "Failed to get error statistics" },
      { status: 500 },
    );
  }
}

// =====================================================
// GET - Test critical error with email notification
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Track a CRITICAL error (should send email)
    const errorId = await trackError({
      code: "TEST_CRITICAL_ERROR",
      message: "Bu bir test CRITICAL hatasıdır - Email gönderilmeli",
      severity: "CRITICAL",
      component: "TestAPI",
      function: "GET /api/test-error-tracking",
      stack: new Error().stack,
      context: {
        testType: "Critical Error Test",
        shouldSendEmail: true,
        timestamp: new Date().toISOString(),
      },
      requestPath: request.nextUrl.pathname,
      requestMethod: request.method,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      isOperational: false,
      notifyAdmin: true,
    });

    return NextResponse.json({
      success: true,
      message: "Critical error tracked and email notification sent",
      errorId,
      note: "Check your email for the error notification",
    });
  } catch (error) {
    console.error("[TEST CRITICAL ERROR] Failed:", error);
    return NextResponse.json(
      { error: "Failed to track critical error" },
      { status: 500 },
    );
  }
}
