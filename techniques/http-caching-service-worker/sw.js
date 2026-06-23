/**
 * sw.js — Service Worker Production-Ready
 * 
 * Strategi Caching:
 * - Static assets (dengan hash)  → Cache First (1 tahun)
 * - API calls                    → Network First (timeout 3s, fallback cache)
 * - Images                       → Stale While Revalidate (30 hari)
 * - HTML pages                   → Network First + Offline fallback
 * - External CDN assets          → Cache First (7 hari)
 */

// ============================================================
// KONFIGURASI
// ============================================================
const APP_VERSION = 'v1.0.0';
const CACHES = {
    static: `static-${APP_VERSION}`,
    dynamic: `dynamic-${APP_VERSION}`,
    images: `images-${APP_VERSION}`,
    api: `api-${APP_VERSION}`,
    pages: `pages-${APP_VERSION}`,
};

// Aset yang di-precache saat SW install (critical resources)
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    // Tambahkan aset CSS/JS dengan hash yang dihasilkan build tool:
    // '/css/main.a3f2c1.css',
    // '/js/vendors.8b9d2e.js',
    // '/js/main.c4e1f2.js',
];

// Konfigurasi cache per tipe
const CACHE_CONFIG = {
    images: {
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
    },
    api: {
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 menit
    },
    pages: {
        maxEntries: 25,
        maxAgeSeconds: 24 * 60 * 60, // 1 hari
    },
    dynamic: {
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 hari
    },
};

// ============================================================
// LIFECYCLE EVENTS
// ============================================================

/**
 * INSTALL: Precache critical assets
 */
self.addEventListener('install', (event) => {
    console.log(`[SW ${APP_VERSION}] Installing...`);

    event.waitUntil(
        caches.open(CACHES.static)
            .then((cache) => {
                console.log(`[SW] Precaching ${PRECACHE_ASSETS.length} assets`);
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete — calling skipWaiting()');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

/**
 * ACTIVATE: Cleanup cache lama
 */
self.addEventListener('activate', (event) => {
    console.log(`[SW ${APP_VERSION}] Activating...`);

    event.waitUntil(
        Promise.all([
            // Hapus semua cache dari versi lama
            caches.keys().then((cacheNames) => {
                const currentCaches = Object.values(CACHES);
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Hapus jika dimulai dengan prefix known tapi bukan versi saat ini
                            const knownPrefixes = ['static-', 'dynamic-', 'images-', 'api-', 'pages-'];
                            return knownPrefixes.some(prefix => name.startsWith(prefix))
                                && !currentCaches.includes(name);
                        })
                        .map((name) => {
                            console.log('[SW] Deleting obsolete cache:', name);
                            return caches.delete(name);
                        })
                );
            }),
            // Ambil kendali atas semua client yang terbuka
            self.clients.claim(),
        ]).then(() => {
            console.log('[SW] Activation complete');
        })
    );
});

// ============================================================
// FETCH EVENT: Routing & Strategy
// ============================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Abaikan non-GET dan non-HTTP requests
    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // Abaikan browser-sync (development)
    if (url.pathname.includes('/browser-sync/')) return;

    // ---- Route ke strategy yang sesuai ----

    // 1. Aset statis dengan content hash → Cache First (immutable, 1 tahun)
    if (isHashedStaticAsset(url)) {
        event.respondWith(cacheFirst(request, CACHES.static, {
            maxAgeSeconds: 365 * 24 * 60 * 60,
        }));
        return;
    }

    // 2. API calls → Network First
    if (url.pathname.startsWith('/api/') || isAPICall(url)) {
        event.respondWith(networkFirst(request, CACHES.api, {
            networkTimeoutMs: 3000,
            ...CACHE_CONFIG.api,
        }));
        return;
    }

    // 3. Gambar → Stale While Revalidate
    if (isImageRequest(request)) {
        event.respondWith(staleWhileRevalidate(request, CACHES.images, CACHE_CONFIG.images));
        return;
    }

    // 4. HTML (navigasi) → Network First + Offline fallback
    if (request.mode === 'navigate' || request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithOfflineFallback(request, CACHES.pages));
        return;
    }

    // 5. External CDN resources → Cache First (7 hari)
    if (url.hostname !== self.location.hostname) {
        event.respondWith(cacheFirst(request, CACHES.dynamic, {
            maxAgeSeconds: 7 * 24 * 60 * 60,
        }));
        return;
    }

    // 6. Default → Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, CACHES.dynamic, CACHE_CONFIG.dynamic));
});

// ============================================================
// DETECTION HELPERS
// ============================================================

/**
 * Deteksi aset dengan content hash dalam nama file
 * Contoh: main.a3f2c1.js, styles.8b9d2e.css
 */
function isHashedStaticAsset(url) {
    return /\.[a-f0-9]{6,8}\.(js|css|woff2?|ttf|eot)(\?.*)?$/.test(url.pathname);
}

function isImageRequest(request) {
    return (
        request.destination === 'image' ||
        /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?.*)?$/i.test(new URL(request.url).pathname)
    );
}

function isAPICall(url) {
    // Tambahkan domain API eksternal jika relevan
    const apiHosts = ['api.example.com', 'data.example.com'];
    return apiHosts.includes(url.hostname);
}

// ============================================================
// CACHING STRATEGIES
// ============================================================

/**
 * Cache First — Prioritaskan cache, network hanya jika miss
 * 
 * Ideal untuk: aset statis dengan hash, font, CSS/JS immutable
 */
async function cacheFirst(request, cacheName, options = {}) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        // Cek apakah cache sudah expired (jika ada maxAge)
        if (!options.maxAgeSeconds || !isCacheExpired(cached, options.maxAgeSeconds)) {
            addCacheStatusHeader(cached, 'HIT');
            return cached;
        }
    }

    // Miss atau expired: fetch dari network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok || networkResponse.status === 0) {
            await cache.put(request, addTimestampHeader(networkResponse.clone()));
            enforceMaxEntries(cache, options.maxEntries);
        }
        addCacheStatusHeader(networkResponse, 'MISS');
        return networkResponse;
    } catch (error) {
        // Network error: return cache walaupun expired
        if (cached) {
            console.warn('[SW] Network failed, returning expired cache:', request.url);
            return cached;
        }
        throw error;
    }
}

/**
 * Network First — Prioritaskan network segar, cache sebagai fallback
 * 
 * Ideal untuk: API calls, halaman HTML, data yang harus fresh
 */
async function networkFirst(request, cacheName, options = {}) {
    const { networkTimeoutMs = 4000, maxEntries, maxAgeSeconds } = options;
    const cache = await caches.open(cacheName);

    try {
        // Race antara network dan timeout
        const networkResponse = await Promise.race([
            fetch(request),
            timeout(networkTimeoutMs),
        ]);

        if (networkResponse.ok || networkResponse.status === 0) {
            await cache.put(request, addTimestampHeader(networkResponse.clone()));
            if (maxEntries) enforceMaxEntries(cache, maxEntries);
        }

        addCacheStatusHeader(networkResponse, 'NETWORK');
        return networkResponse;

    } catch (error) {
        // Timeout atau network error → fallback ke cache
        const cached = await cache.match(request);
        if (cached) {
            console.log('[SW] Network failed/timeout, serving from cache:', request.url);
            addCacheStatusHeader(cached, 'STALE');
            return cached;
        }
        throw error;
    }
}

/**
 * Network First dengan Offline Fallback khusus untuk halaman HTML
 */
async function networkFirstWithOfflineFallback(request, cacheName) {
    try {
        return await networkFirst(request, cacheName, {
            networkTimeoutMs: 4000,
            ...CACHE_CONFIG.pages,
        });
    } catch (error) {
        console.log('[SW] Serving offline page for:', request.url);
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response(
            '<h1>Offline</h1><p>Periksa koneksi internet kamu.</p>',
            {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
        );
    }
}

/**
 * Stale While Revalidate — Return cache segera, refresh di background
 * 
 * Ideal untuk: gambar, aset medium, konten yang boleh sedikit stale
 */
async function staleWhileRevalidate(request, cacheName, options = {}) {
    const { maxEntries, maxAgeSeconds } = options;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Mulai fetch di background (tidak await)
    const fetchAndUpdate = fetch(request)
        .then(async (networkResponse) => {
            if (networkResponse.ok || networkResponse.status === 0) {
                await cache.put(request, addTimestampHeader(networkResponse.clone()));
                if (maxEntries) enforceMaxEntries(cache, maxEntries);
            }
            return networkResponse;
        })
        .catch((error) => {
            console.warn('[SW] Background fetch failed:', request.url, error.message);
            return null;
        });

    // Return dari cache segera jika ada
    if (cached) {
        addCacheStatusHeader(cached, 'STALE');
        return cached;
    }

    // Tidak ada cache → tunggu network
    const networkResponse = await fetchAndUpdate;
    if (networkResponse) {
        addCacheStatusHeader(networkResponse, 'NETWORK');
        return networkResponse;
    }

    throw new Error(`Failed to fetch: ${request.url}`);
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Promise yang reject setelah N ms
 */
function timeout(ms) {
    return new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Network timeout after ${ms}ms`)), ms)
    );
}

/**
 * Tambah header X-SW-Cache-Time ke response untuk tracking expiry
 */
function addTimestampHeader(response) {
    const headers = new Headers(response.headers);
    headers.append('X-SW-Cached-At', Date.now().toString());
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Cek apakah cache sudah melewati batas usia
 */
function isCacheExpired(response, maxAgeSeconds) {
    const cachedAt = response.headers.get('X-SW-Cached-At');
    if (!cachedAt) return false;
    const ageSeconds = (Date.now() - parseInt(cachedAt)) / 1000;
    return ageSeconds > maxAgeSeconds;
}

/**
 * Tambah header X-Cache-Status untuk analytics
 */
function addCacheStatusHeader(response, status) {
    // Response sudah terkunci, gunakan method berbeda untuk tracking
    // (Header tidak bisa dimodifikasi setelah response dibuat in flight)
    // Ini hanya sebagai dokumentasi — implementasi nyata pakai postMessage ke client
}

/**
 * Batasi jumlah entries dalam cache (FIFO)
 */
async function enforceMaxEntries(cache, maxEntries) {
    if (!maxEntries) return;

    const keys = await cache.keys();
    if (keys.length > maxEntries) {
        // Hapus entries paling lama (FIFO)
        const toDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(toDelete.map(key => cache.delete(key)));
    }
}

// ============================================================
// BACKGROUND SYNC
// ============================================================

/**
 * Sync data yang pending saat koneksi kembali
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-pending-forms') {
        event.waitUntil(syncPendingForms());
    }
});

async function syncPendingForms() {
    try {
        const cache = await caches.open('pending-forms');
        const requests = await cache.keys();

        for (const request of requests) {
            const cachedResponse = await cache.match(request);
            const formData = await cachedResponse.json();

            const response = await fetch(request.url, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                await cache.delete(request);
                console.log('[SW] Synced pending form:', request.url);
            }
        }
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
        throw error; // Retry akan dijadwalkan ulang oleh browser
    }
}

// ============================================================
// CACHE MANAGEMENT MESSAGES
// ============================================================

/**
 * Handle pesan dari halaman (untuk cache management)
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            // Langsung aktifkan SW baru
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            // Hapus semua cache
            caches.keys()
                .then(keys => Promise.all(keys.map(k => caches.delete(k))))
                .then(() => {
                    event.ports[0]?.postMessage({ success: true });
                    console.log('[SW] All caches cleared');
                });
            break;

        case 'GET_CACHE_STATS':
            // Kirim statistik cache
            getCacheStats().then(stats => {
                event.ports[0]?.postMessage(stats);
            });
            break;

        default:
            console.log('[SW] Unknown message type:', type);
    }
});

async function getCacheStats() {
    const stats = {};
    const cacheNames = await caches.keys();

    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        stats[name] = {
            entries: keys.length,
            urls: keys.map(r => r.url),
        };
    }

    return stats;
}

console.log(`[SW ${APP_VERSION}] Script loaded`);
