/**
 * GLOBAL ERROR HANDLER
 *
 * Tüm console.error ve unhandled errors'ı yakalar ve veritabanına kaydeder
 */

import { trackError } from "./error-tracking";

// Original console.error'ı sakla
const originalConsoleError = console.error;

// Console.error'ı override et
console.error = function (...args: any[]) {
  // Original console.error'ı çağır (log'lar görünsün)
  originalConsoleError.apply(console, args);

  // Veritabanına kaydet
  const errorMessage = args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");

  const errorStack = args.find((arg) => arg instanceof Error)?.stack;

  // Async olarak track et (blocking olmasın)
  trackError({
    code: "CONSOLE_ERROR",
    message: errorMessage,
    severity: "MEDIUM",
    stack: errorStack,
    component: "GlobalErrorHandler",
    function: "console.error",
  }).catch((err) => {
    // Error tracking hatası olursa sadece log'la
    originalConsoleError("[ERROR TRACKING FAILED]", err);
  });
};

// Unhandled Promise Rejections
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    console.error("[UNHANDLED REJECTION]", reason);

    trackError({
      code: "UNHANDLED_REJECTION",
      message: reason instanceof Error ? reason.message : String(reason),
      severity: "HIGH",
      stack: reason instanceof Error ? reason.stack : undefined,
      component: "GlobalErrorHandler",
      function: "unhandledRejection",
      context: {
        promise: String(promise),
      },
      notifyAdmin: true,
    }).catch((err) => {
      originalConsoleError("[ERROR TRACKING FAILED]", err);
    });
  });

  // Uncaught Exceptions
  process.on("uncaughtException", (error: Error) => {
    console.error("[UNCAUGHT EXCEPTION]", error);

    trackError({
      code: "UNCAUGHT_EXCEPTION",
      message: error.message,
      severity: "CRITICAL",
      stack: error.stack,
      component: "GlobalErrorHandler",
      function: "uncaughtException",
      notifyAdmin: true,
    }).catch((err) => {
      originalConsoleError("[ERROR TRACKING FAILED]", err);
    });

    // Critical error - exit process
    process.exit(1);
  });
}

export function initializeGlobalErrorHandler() {
  console.log("[GLOBAL ERROR HANDLER] Initialized");
}
