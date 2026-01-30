// Service Worker - Offline support ve caching stratejisi

const CACHE_VERSION = "v1";
const CACHE_NAME = `optimus-vet-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = ["/", "/favicon.ico", "/manifest.json"];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching core assets");
      return cache.addAll(PRECACHE_ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("optimus-vet-") && name !== CACHE_NAME,
          )
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Ignore chrome-extension requests
  if (url.protocol.startsWith("chrome-extension")) {
    return;
  }

  // Ignore webpack-hmr and socket requests to prevent dev errors
  if (
    url.pathname.includes("webpack-hmr") ||
    url.pathname.includes("socket.io")
  ) {
    return;
  }

  // Skip API calls - always fetch from network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetchWithFallback(request));
    return;
  }

  // Cache-first strategy for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for navigation
  event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.add(request.clone());
    }
    return response;
  } catch (error) {
    console.error("[SW] Fetch failed:", error);
    return new Response("Offline - Resource not cached", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request.clone(), response.clone());
    }
    return response;
  } catch (error) {
    console.error("[SW] Network fetch failed:", error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response("Offline - Page not available", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Fetch with network fallback
async function fetchWithFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error("[SW] API call failed:", error);
    return new Response(
      JSON.stringify({ error: "Offline - API not available" }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Helper to determine if request is for static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/.test(pathname);
}

// Background sync for offline transactions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-transactions") {
    event.waitUntil(syncOfflineTransactions());
  }
});

async function syncOfflineTransactions() {
  try {
    const db = await openIndexedDB();
    const pendingTransactions = await getPendingTransactions(db);

    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transaction),
        });

        if (response.ok) {
          await removePendingTransaction(db, transaction.id);
        }
      } catch (error) {
        console.error("[SW] Failed to sync transaction:", error);
      }
    }
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("optimusvet", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Push notification support
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: data.tag || "notification",
    requireInteraction: data.urgent ?? false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Optimus Vet", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});
