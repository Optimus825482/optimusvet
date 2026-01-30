import { useEffect } from "react";

export function usePWA() {
  useEffect(() => {
    // Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);
        })
        .catch((error: any) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  // Install prompt handler
  useEffect(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null;

    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    });

    window.addEventListener("appinstalled", () => {
      console.log("[PWA] App installed");
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {});
      window.removeEventListener("appinstalled", () => {});
    };
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log("[PWA] App is online");
      // Trigger background sync
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync.register("sync-transactions").catch((error: any) => {
            console.error("[PWA] Sync registration failed:", error);
          });
        });
      }
    };

    const handleOffline = () => {
      console.log("[PWA] App is offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
}

// Disable type checking for this file
declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
}
