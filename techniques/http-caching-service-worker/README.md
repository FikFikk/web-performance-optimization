# HTTP Caching & Service Worker: Strategi Cache untuk Performa Maksimal

## Daftar Isi
- [Pendahuluan & Konteks Masalah](#pendahuluan--konteks-masalah)
- [Dampak terhadap Core Web Vitals](#dampak-terhadap-core-web-vitals)
- [Lapisan Caching yang Perlu Dipahami](#lapisan-caching-yang-perlu-dipahami)
- [HTTP Cache Headers](#http-cache-headers)
- [Service Worker Caching Strategy](#service-worker-caching-strategy)
- [Workbox: Framework Caching Terbaik](#workbox-framework-caching-terbaik)
- [Before & After Metrics](#before--after-metrics)
- [Real-World Case Studies](#real-world-case-studies)
- [Implementation Checklist](#implementation-checklist)
- [Tools & Monitoring](#tools--monitoring)
- [Referensi](#referensi)

---

## Pendahuluan & Konteks Masalah

Setiap kali pengguna mengunjungi website, browser harus mengunduh semua aset: HTML, CSS, JavaScript, gambar, font, dan data API. Proses ini memakan waktu yang signifikan — terutama pada koneksi lambat atau perangkat mobile dengan latensi tinggi.

**Masalah utama tanpa strategi caching yang baik:**

| Masalah | Dampak |
|---|---|
| Reload full page setiap kunjungan | +2–5 detik load time per visit berulang |
| Asset statis selalu diunduh ulang | Pemborosan bandwidth & waktu |
| API response tidak di-cache | Konten lambat meski data tidak berubah |
| Tidak ada offline support | User experience buruk pada koneksi lemah |
| Cache invalidation salah | User lihat konten lama atau error |

### Skala Masalah di Dunia Nyata

Berdasarkan data dari **HTTP Archive** (2024):
- Rata-rata halaman web berukuran **2.3 MB**
- Pengguna mobile dengan 3G menghabiskan **8–15 detik** untuk load pertama
- **47% pengguna** meninggalkan halaman jika load > 3 detik (Akamai, 2024)
- Namun pada **kunjungan berulang** (repeat visits), jika caching optimal, load time bisa turun hingga **< 200ms**

Caching adalah investasi terbaik: sekali setup, ratusan ribu request selanjutnya menjadi instan.

---

## Dampak terhadap Core Web Vitals

### Time to First Byte (TTFB)
- **Target:** < 800ms (Good), < 1800ms (Needs Improvement)
- Caching server-side + CDN dapat menurunkan TTFB dari **1.2s → 120ms** (10x improvement)

### Largest Contentful Paint (LCP)
- **Target:** < 2.5 detik
- Dengan resource caching, asset sudah tersedia dari cache → LCP turun drastis
- Improvement tipikal: **4.2s → 1.1s** pada repeat visits

### First Input Delay (FID) / Interaction to Next Paint (INP)
- **Target INP:** < 200ms
- Cache JS yang sudah diparse → mengurangi parse time → respons interaksi lebih cepat

### Cumulative Layout Shift (CLS)
- Asset yang ter-cache dimuat lebih konsisten → mengurangi layout shift dari late-loading resources
- Font yang di-cache tidak menyebabkan FOUT (Flash of Unstyled Text)

---

## Lapisan Caching yang Perlu Dipahami

```
┌─────────────────────────────────────────────────────┐
│                    USER REQUEST                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           1. SERVICE WORKER CACHE (Browser)          │
│   Kontrol penuh, offline support, strategi custom   │
└──────────────────────┬──────────────────────────────┘
                       │ miss
                       ▼
┌─────────────────────────────────────────────────────┐
│           2. BROWSER HTTP CACHE                      │
│   Memory cache (session) + Disk cache (persistent)  │
└──────────────────────┬──────────────────────────────┘
                       │ miss
                       ▼
┌─────────────────────────────────────────────────────┐
│           3. CDN / EDGE CACHE                        │
│   Cloudflare, AWS CloudFront, Fastly, Vercel Edge   │
└──────────────────────┬──────────────────────────────┘
                       │ miss
                       ▼
┌─────────────────────────────────────────────────────┐
│           4. SERVER-SIDE CACHE                       │
│   Redis, Memcached, Varnish, Next.js cache          │
└──────────────────────┬──────────────────────────────┘
                       │ miss
                       ▼
┌─────────────────────────────────────────────────────┐
│           5. DATABASE / ORIGIN                       │
│   Query hasil, data segar dari sumber               │
└─────────────────────────────────────────────────────┘
```

Tujuan: **stop request se-awal mungkin** dalam chain ini.

---

## HTTP Cache Headers

### 1. Cache-Control: Direktif Utama

```nginx
# nginx.conf — Konfigurasi cache headers optimal

# Aset statis dengan hash (CSS, JS, Images yang di-versioning)
# Contoh: main.a3f2c1.js, styles.8b9d2e.css
location ~* \.(js|css|png|jpg|jpeg|gif|ico|webp|avif|woff2|woff)$ {
    # Cache 1 tahun — aman karena filename berisi hash
    add_header Cache-Control "public, max-age=31536000, immutable";
    
    # Izinkan CDN cache juga
    add_header Vary "Accept-Encoding";
}

# HTML pages — jangan cache lama, butuh freshness
location ~* \.html$ {
    add_header Cache-Control "no-cache";
    # no-cache = boleh cache, tapi HARUS revalidasi ke server sebelum pakai
    # Berbeda dari no-store yang melarang caching sama sekali
}

# API responses yang jarang berubah
location /api/static-data {
    add_header Cache-Control "public, max-age=3600, stale-while-revalidate=86400";
}

# API responses yang personal/user-specific
location /api/user {
    add_header Cache-Control "private, no-cache";
}
```

### 2. Penjelasan Direktif Cache-Control

| Direktif | Arti | Kapan Digunakan |
|---|---|---|
| `public` | Bisa disimpan oleh semua cache (browser, CDN, proxy) | Aset statis, konten publik |
| `private` | Hanya cache browser, bukan CDN/proxy | Data personal user |
| `max-age=N` | Cache valid selama N detik | Semua cacheable resource |
| `no-cache` | Cache boleh, tapi revalidasi dulu | HTML, konten yang mungkin berubah |
| `no-store` | Jangan cache sama sekali | Data sensitif (payment, secret) |
| `immutable` | Resource tidak akan berubah (gunakan bersama max-age) | Aset dengan content hash |
| `stale-while-revalidate=N` | Sajikan cache sambil refresh di background | API, semi-dynamic content |
| `stale-if-error=N` | Gunakan cache lama jika server error | Semua resource penting |
| `must-revalidate` | Jangan gunakan stale cache tanpa izin server | Data yang harus akurat |

### 3. ETag & Last-Modified: Cache Revalidation

```javascript
// server/cache-revalidation.js (contoh Express.js)

const express = require('express');
const crypto = require('crypto');
const app = express();

// Middleware untuk ETag otomatis
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(body) {
        if (typeof body === 'string' || Buffer.isBuffer(body)) {
            // Generate ETag dari content
            const etag = crypto
                .createHash('md5')
                .update(body)
                .digest('hex');
            res.set('ETag', `"${etag}"`);
            
            // Check If-None-Match dari browser
            const clientEtag = req.headers['if-none-match'];
            if (clientEtag === `"${etag}"`) {
                // Content tidak berubah — kirim 304, hemat bandwidth
                return res.status(304).end();
            }
        }
        return originalSend.call(this, body);
    };
    next();
});

// Contoh endpoint dengan manual cache control
app.get('/api/products', async (req, res) => {
    const products = await getProducts();
    const lastModified = await getLastUpdateTime('products');
    
    res.set({
        'Last-Modified': lastModified.toUTCString(),
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Vary': 'Accept-Encoding, Accept-Language'
    });
    
    // Check If-Modified-Since
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
        return res.status(304).end();
    }
    
    res.json(products);
});
```

### 4. Cache Busting dengan Content Hash

```javascript
// webpack.config.js — Asset fingerprinting
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        // [contenthash] = hash dari content file, berubah hanya jika isi berubah
        filename: 'js/[name].[contenthash:8].js',
        chunkFilename: 'js/[name].[contenthash:8].chunk.js',
        assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
        clean: true, // Hapus output lama
    },
    
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            // HTML tidak di-hash — selalu fresh
        }),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash:8].css',
        }),
    ],
    
    optimization: {
        // Pisahkan runtime chunk agar hash tidak berubah jika hanya app code yang berubah
        runtimeChunk: 'single',
        
        splitChunks: {
            cacheGroups: {
                // Vendor libraries: jarang berubah → cache sangat lama
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                },
            },
        },
    },
};
```

---

## Service Worker Caching Strategy

Service Worker adalah JavaScript yang berjalan di background, bertindak sebagai proxy antara browser dan network. Ini memungkinkan kendali penuh atas caching dan offline support.

### Strategi Caching Utama

#### 1. Cache First (untuk aset statis)
```
Request → Cek Cache → [Hit] → Return dari Cache
                    → [Miss] → Fetch Network → Simpan ke Cache → Return
```
**Kapan:** Aset statis (gambar, font, CSS/JS yang sudah di-hash)

#### 2. Network First (untuk data dinamis)
```
Request → Fetch Network → [Sukses] → Update Cache → Return
                       → [Gagal/Timeout] → Cek Cache → Return
```
**Kapan:** API calls, HTML pages, data yang harus fresh

#### 3. Stale While Revalidate (untuk konten semi-dinamis)
```
Request → Cek Cache → [Hit] → Return dari Cache (segera!)
                             → Fetch Network di background → Update Cache
                   → [Miss] → Fetch Network → Return & Simpan Cache
```
**Kapan:** News feed, product catalog, konten yang boleh sedikit stale

#### 4. Cache Only (untuk offline-first resources)
```
Request → Cek Cache → Return (network tidak pernah disentuh)
```
**Kapan:** Aset yang di-precache saat install

#### 5. Network Only (untuk resource yang tidak boleh di-cache)
```
Request → Fetch Network → Return (cache tidak pernah disentuh)
```
**Kapan:** Analytics, payment API, data real-time

### Implementasi Service Worker dari Scratch

```javascript
// public/sw.js — Service Worker Implementation

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Aset yang di-precache saat SW install
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/css/main.a3f2c1.css',
    '/js/vendors.8b9d2e.js',
    '/js/main.c4e1f2.js',
    '/images/logo.webp',
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Precaching critical assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Langsung aktifkan SW baru tanpa tunggu tab lama ditutup
                return self.skipWaiting();
            })
    );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        // Hapus cache lama yang tidak diperlukan
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Hapus cache yang versinya berbeda
                            return name.startsWith('static-') && name !== STATIC_CACHE
                                || name.startsWith('dynamic-') && name !== DYNAMIC_CACHE
                                || name.startsWith('api-') && name !== API_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Ambil kendali atas semua client yang terbuka
                return self.clients.claim();
            })
    );
});

// ===== FETCH EVENT: Routing Logic =====
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Abaikan request non-GET
    if (request.method !== 'GET') return;
    
    // Abaikan Chrome extension requests
    if (!url.protocol.startsWith('http')) return;
    
    // ---- Routing berdasarkan tipe resource ----
    
    // 1. Aset statis dengan hash → Cache First
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }
    
    // 2. API calls → Network First dengan fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE, 3000));
        return;
    }
    
    // 3. Gambar → Stale While Revalidate
    if (isImageRequest(request)) {
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        return;
    }
    
    // 4. HTML pages → Network First
    if (request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithOffline(request, DYNAMIC_CACHE));
        return;
    }
    
    // Default: Network First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 5000));
});

// ===== HELPER: Detect Static Assets =====
function isStaticAsset(url) {
    // Aset dengan content hash dalam nama file
    return /\.(js|css|woff2?|ttf)(\?.*)?$/.test(url.pathname)
        && /\.[a-f0-9]{8}\./.test(url.pathname);
}

function isImageRequest(request) {
    return request.destination === 'image'
        || /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?.*)?$/.test(new URL(request.url).pathname);
}

// ===== STRATEGI: Cache First =====
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached; // Hit! Return dari cache
    }
    
    // Miss: fetch dari network dan simpan
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
}

// ===== STRATEGI: Network First =====
async function networkFirst(request, cacheName, timeoutMs = 4000) {
    const cache = await caches.open(cacheName);
    
    try {
        // Buat timeout race
        const networkResponse = await Promise.race([
            fetch(request),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
            )
        ]);
        
        if (networkResponse.ok) {
            // Update cache dengan response terbaru
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        // Network gagal / timeout → fallback ke cache
        const cached = await cache.match(request);
        if (cached) {
            console.log('[SW] Network failed, serving from cache:', request.url);
            return cached;
        }
        throw error;
    }
}

// ===== STRATEGI: Network First dengan Offline Page =====
async function networkFirstWithOffline(request, cacheName) {
    try {
        return await networkFirst(request, cacheName, 4000);
    } catch (error) {
        // Fallback ke offline page
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response('Offline', { status: 503 });
    }
}

// ===== STRATEGI: Stale While Revalidate =====
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    // Refresh di background (tidak menunggu)
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null); // Abaikan error network jika ada cache
    
    // Return cache segera jika ada, atau tunggu network
    return cached || fetchPromise;
}

// ===== BACKGROUND SYNC: Untuk offline POST requests =====
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-form') {
        event.waitUntil(syncPendingData());
    }
});

async function syncPendingData() {
    // Implementasi sync data yang pending saat offline
    try {
        const cache = await caches.open('pending-requests');
        const requests = await cache.keys();
        
        for (const request of requests) {
            const cachedResponse = await cache.match(request);
            const data = await cachedResponse.json();
            
            await fetch(request.url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            
            await cache.delete(request);
        }
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}
```

### Registrasi Service Worker di Aplikasi

```javascript
// src/register-sw.js

async function registerServiceWorker() {
    // Feature detection
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker tidak didukung browser ini');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            // Scope: SW hanya aktif untuk path ini ke bawah
            scope: '/',
            // updateViaCache: SW file sendiri tidak di-cache (selalu fresh)
            updateViaCache: 'none',
        });
        
        console.log('[App] Service Worker terdaftar, scope:', registration.scope);
        
        // Cek update saat user balik ke tab
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                registration.update();
            }
        });
        
        // Notifikasi user jika ada versi baru
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Ada versi baru — tampilkan notifikasi update
                    showUpdateNotification();
                }
            });
        });
        
        return registration;
        
    } catch (error) {
        console.error('[App] Service Worker gagal terdaftar:', error);
    }
}

function showUpdateNotification() {
    // Buat banner notifikasi update
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #1a73e8; color: white; padding: 12px 24px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999;
        display: flex; gap: 16px; align-items: center;
    `;
    banner.innerHTML = `
        <span>🔄 Versi terbaru tersedia!</span>
        <button onclick="window.location.reload()" 
            style="background:white; color:#1a73e8; border:none; 
                   padding:6px 16px; border-radius:4px; cursor:pointer; font-weight:bold;">
            Perbarui
        </button>
    `;
    document.body.appendChild(banner);
}

// Daftarkan setelah halaman load
window.addEventListener('load', registerServiceWorker);
```

---

## Workbox: Framework Caching Terbaik

[Workbox](https://developer.chrome.com/docs/workbox/) adalah library dari Google yang menyederhanakan Service Worker dan caching strategy.

### Instalasi

```bash
npm install workbox-webpack-plugin workbox-window
# atau untuk Vite:
npm install vite-plugin-pwa
```

### Konfigurasi Workbox dengan Webpack

```javascript
// webpack.config.js
const { GenerateSW, InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
    // ... konfigurasi lain
    
    plugins: [
        // OPSI 1: GenerateSW — Workbox generate SW otomatis
        new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            
            // Precache semua aset di output webpack
            // (otomatis berdasarkan manifest yang dihasilkan webpack)
            
            runtimeCaching: [
                // Google Fonts
                {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'google-fonts-stylesheets',
                    },
                },
                {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'google-fonts-webfonts',
                        expiration: {
                            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
                            maxEntries: 30,
                        },
                        cacheableResponse: { statuses: [0, 200] },
                    },
                },
                
                // Gambar dinamis
                {
                    urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico)$/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'images',
                        expiration: {
                            maxEntries: 60,
                            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
                        },
                    },
                },
                
                // API dengan stale-while-revalidate
                {
                    urlPattern: /^https:\/\/api\.example\.com\/products/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'api-products',
                        expiration: {
                            maxEntries: 50,
                            maxAgeSeconds: 60 * 5, // 5 menit
                        },
                        cacheableResponse: { statuses: [0, 200] },
                    },
                },
                
                // Halaman HTML
                {
                    urlPattern: ({ request }) => request.mode === 'navigate',
                    handler: 'NetworkFirst',
                    options: {
                        cacheName: 'pages',
                        networkTimeoutSeconds: 3,
                        expiration: { maxEntries: 25 },
                    },
                },
            ],
        }),
    ],
};
```

### Konfigurasi Vite PWA (Modern Setup)

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            
            // Precache semua output Vite
            includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            
            manifest: {
                name: 'My App',
                short_name: 'App',
                theme_color: '#1a73e8',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            
            workbox: {
                // Strategi per resource type
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\./i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: { maxEntries: 100, maxAgeSeconds: 300 },
                            networkTimeoutSeconds: 10,
                        },
                    },
                    {
                        urlPattern: /\.(?:js|css|woff2?)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'static-resources',
                            expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
                        },
                    },
                ],
            },
        }),
    ],
});
```

---

## Konfigurasi Server Lengkap

### Nginx — Konfigurasi Cache Optimal

```nginx
# /etc/nginx/sites-available/myapp.conf

server {
    listen 443 ssl http2;
    server_name example.com;
    
    # Gzip compression (hemat bandwidth = lebih cepat)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/javascript application/xml+rss application/json
        image/svg+xml font/truetype font/opentype application/font-woff;
    
    # Brotli (lebih baik dari gzip, jika tersedia)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/html text/css application/javascript ...;
    
    root /var/www/myapp/dist;
    
    # ---- Cache Rules ----
    
    # HTML — jangan cache, selalu fresh
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }
    
    # Service Worker — jangan cache (harus selalu terbaru)
    location = /sw.js {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }
    
    # Aset dengan hash — cache sangat lama (immutable)
    location ~* \.[a-f0-9]{8}\.(js|css|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Vary "Accept-Encoding";
        
        # Security headers
        add_header X-Content-Type-Options "nosniff";
    }
    
    # Gambar dengan hash
    location ~* \.[a-f0-9]{8}\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Gambar tanpa hash — cache sedang
    location ~* \.(png|jpg|jpeg|gif|webp|avif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # Font tanpa hash
    location ~* \.(woff2?|ttf|eot|otf)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # API proxy ke backend
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_cache_bypass $http_upgrade;
        
        # Tambahan header untuk proxy
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        
        # index.html tidak di-cache
        add_header Cache-Control "no-cache";
    }
}
```

### Apache — .htaccess

```apache
# .htaccess

<IfModule mod_expires.c>
    ExpiresActive On
    
    # Default: 1 jam
    ExpiresDefault "access plus 1 hour"
    
    # HTML: no cache
    ExpiresByType text/html "access plus 0 seconds"
    
    # CSS & JS dengan hash: 1 tahun
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    
    # Gambar: 1 bulan
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType image/avif "access plus 1 month"
    
    # Font: 1 tahun
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Cache-Control headers tambahan
<IfModule mod_headers.c>
    # Aset dengan hash = immutable
    <FilesMatch "\.[a-f0-9]{8}\.(js|css|woff2)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
    
    # Service Worker
    <FilesMatch "sw\.js$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>
    
    # Vary untuk encoding
    <FilesMatch "\.(js|css|html|xml|json|svg)$">
        Header append Vary Accept-Encoding
    </FilesMatch>
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
    AddOutputFilterByType DEFLATE application/json image/svg+xml font/woff2
</IfModule>
```

---

## Offline Page yang Baik

```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tidak Ada Koneksi — MyApp</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f8f9fa;
            color: #333;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #333; }
        p { color: #666; margin-bottom: 1.5rem; line-height: 1.6; }
        button {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover { background: #1557b0; }
        .cached-note {
            margin-top: 1rem;
            font-size: 0.85rem;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>Tidak Ada Koneksi Internet</h1>
        <p>
            Sepertinya kamu sedang offline. Beberapa konten yang pernah dikunjungi 
            mungkin masih tersedia dari cache.
        </p>
        <button onclick="window.location.reload()">
            🔄 Coba Lagi
        </button>
        <p class="cached-note">
            Konten yang pernah dibuka sebelumnya tetap dapat diakses.
        </p>
    </div>
    
    <script>
        // Auto-reload saat koneksi kembali
        window.addEventListener('online', () => {
            window.location.reload();
        });
    </script>
</body>
</html>
```

---

## Before & After Metrics

### Skenario: E-commerce Product Listing Page

**Environment:**
- Hosting: VPS dengan Nginx
- Koneksi test: Fast 3G (simulasi Lighthouse)
- Halaman: product listing dengan 24 produk, gambar, filter

#### SEBELUM Optimasi (tanpa caching strategy)

```
First Visit:
├── HTML          → 245 KB, no cache headers
├── main.js       → 892 KB, no cache headers  
├── vendor.js     → 1.2 MB, no cache headers
├── styles.css    → 187 KB, no cache headers  
├── 24 gambar     → rata-rata 180KB/gambar
└── 4 API calls   → tanpa cache, rata-rata 380ms/call

Metrics:
├── TTFB              → 420ms
├── FCP               → 3.8s
├── LCP               → 5.2s
├── Total Load Time   → 8.7s (first visit)
├── Total Load Time   → 6.1s (repeat visit, browser cache default)
└── Data Transfer     → 7.3 MB
```

#### SESUDAH Optimasi (HTTP Cache + Service Worker)

```
First Visit (sama seperti sebelum — harus download):
├── TTFB              → 380ms  (sedikit lebih baik karena gzip)
├── FCP               → 3.6s
├── LCP               → 4.8s
├── Total Load Time   → 8.2s
└── Data Transfer     → 1.9 MB (gzip + webp)

Repeat Visit (dengan cache strategy):
├── TTFB              → 12ms   (dari service worker cache!)
├── FCP               → 0.4s   ← dari cache, hampir instan
├── LCP               → 0.9s   ← gambar dari cache
├── Total Load Time   → 1.1s
├── Data Transfer     → 47 KB  (hanya API calls yang di-revalidate)
└── Requests          → 6/42   (36 request ter-cache)

Improvement (Repeat Visit):
├── TTFB    : 420ms → 12ms    (97% lebih cepat)
├── LCP     : 5.2s  → 0.9s   (83% lebih cepat)
├── Load    : 8.7s  → 1.1s   (87% lebih cepat)
└── Data    : 7.3MB → 47KB   (99% lebih hemat)
```

### Perbandingan Lighthouse Score

| Metrik | Sebelum (Repeat) | Sesudah (Repeat) |
|---|---|---|
| Performance Score | 42 | 94 |
| FCP | 3.8s | 0.4s |
| LCP | 5.2s | 0.9s |
| TTI | 7.1s | 1.4s |
| TBT | 380ms | 45ms |
| CLS | 0.08 | 0.02 |

---

## Real-World Case Studies

### 1. Tokopedia — Service Worker Implementation

Tokopedia mengimplementasikan Progressive Web App dengan Service Worker dan melaporkan:
- **Repeat visit load time:** turun 63% (dari 6.3s → 2.3s)
- **Data yang ditransfer:** berkurang 70% pada repeat visits  
- **Bounce rate:** turun 35% pada pengguna koneksi lambat
- **Konversi:** naik 8% secara keseluruhan

*Sumber: Google I/O case study, web.dev/tokopedia*

### 2. Flipkart — Offline-First Approach

Platform e-commerce India terbesar:
- Implementasi SW caching + offline fallback
- **Time on site:** naik 3x untuk returning users
- **Re-engagement rate:** naik 40%
- **LCP:** turun dari 5.0s → 1.5s pada repeat visits

### 3. Pinterest — Progressive Web App

- SW caching untuk feed images
- **Load time:** turun 40% secara keseluruhan
- **Time to interactive:** turun dari 23s → 5.6s (first visit optimized)
- **Weekly active users:** naik 103% setelah PWA launch

### 4. Twitter Lite

- Agressif SW caching untuk timeline
- **Data yang digunakan:** berkurang 70%
- **Page load time:** turun 30%
- **Tweets sent:** naik 75%

---

## Implementation Checklist

### Phase 1: HTTP Cache Headers (1-2 jam)
- [ ] Audit cache headers saat ini dengan DevTools (Network tab)
- [ ] Setup `Cache-Control: immutable` untuk aset dengan content hash
- [ ] Setup `Cache-Control: no-cache` untuk HTML
- [ ] Deploy content hashing di build pipeline (webpack/vite)
- [ ] Test cache behavior dengan Chrome DevTools → Network → Disable cache OFF

### Phase 2: Service Worker (4-8 jam)
- [ ] Install Workbox atau tulis SW manual
- [ ] Identifikasi resource yang perlu di-precache
- [ ] Implementasi routing strategy sesuai tipe resource
- [ ] Buat offline.html fallback page
- [ ] Test di berbagai browser (Chrome, Firefox, Safari)
- [ ] Test offline behavior (DevTools → Network → Offline)

### Phase 3: Monitoring & Maintenance
- [ ] Setup cache analytics (hit rate, size)
- [ ] Monitor SW lifecycle di production
- [ ] Buat strategy untuk cache invalidation saat deploy baru
- [ ] Setup alerting jika cache hit rate turun drastis

### Perintah Debugging

```javascript
// Di browser console — inspect cache
caches.keys().then(console.log);

// Lihat isi cache tertentu
caches.open('static-v1').then(c => c.keys().then(console.log));

// Hapus semua cache (untuk testing)
caches.keys().then(keys => 
    Promise.all(keys.map(k => caches.delete(k)))
).then(() => console.log('All caches cleared'));

// Check SW registration
navigator.serviceWorker.getRegistrations().then(console.log);
```

---

## Tools & Monitoring

### Measuring Cache Performance

| Tool | Kegunaan |
|---|---|
| **Chrome DevTools → Network** | Lihat cache status (from disk cache, from memory cache, from ServiceWorker) |
| **Chrome DevTools → Application** | Inspect Service Workers, Cache Storage |
| **Lighthouse** | Audit cache policy, generate skor sebelum/sesudah |
| **web.dev/measure** | Test CWV dari luar (field data) |
| **PageSpeed Insights** | Real-world field data (CrUX) + lab data |
| **WebPageTest** | Detailed waterfall, repeat view testing |

### Script Pengukuran Cache Hit Rate

```javascript
// analytics/cache-metrics.js — Ukur dan kirim cache hit rate

const CacheAnalytics = {
    metrics: { hits: 0, misses: 0, total: 0 },
    
    init() {
        // Intercept fetch untuk tracking
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            this.trackResponse(args[0], response);
            return response;
        };
    },
    
    trackResponse(url, response) {
        this.metrics.total++;
        
        // Service Worker menambah header custom untuk tracking
        const cacheStatus = response.headers.get('X-Cache-Status');
        if (cacheStatus === 'HIT') {
            this.metrics.hits++;
        } else {
            this.metrics.misses++;
        }
        
        // Kirim ke analytics setiap 10 request
        if (this.metrics.total % 10 === 0) {
            this.sendMetrics();
        }
    },
    
    sendMetrics() {
        const hitRate = (this.metrics.hits / this.metrics.total * 100).toFixed(1);
        
        // Kirim ke Google Analytics 4
        gtag('event', 'cache_performance', {
            cache_hit_rate: hitRate,
            cache_hits: this.metrics.hits,
            cache_misses: this.metrics.misses,
        });
        
        console.log(`[Cache] Hit rate: ${hitRate}% (${this.metrics.hits}/${this.metrics.total})`);
    }
};

CacheAnalytics.init();
```

### Perintah curl untuk Test Cache Headers

```bash
# Test cache headers dari server
curl -I https://example.com/main.a3f2c1.js

# Expected output:
# HTTP/2 200
# cache-control: public, max-age=31536000, immutable
# content-encoding: gzip
# etag: "abc123def456"

# Test second request (should 304)
curl -I -H "If-None-Match: \"abc123def456\"" https://example.com/main.a3f2c1.js
# HTTP/2 304 (Not Modified — cahce valid!)

# Test gzip support
curl -H "Accept-Encoding: gzip" -o /dev/null -s -w "%{size_download}\n" https://example.com/main.js
```

---

## Referensi

### Dokumentasi Resmi
- [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Google Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [web.dev: Caching Best Practices](https://web.dev/http-cache/)
- [web.dev: Service Worker Caching & HTTP Cache](https://web.dev/service-worker-caching-and-http-caching/)

### Artikel & Tools
- [web.dev: Offline Cookbook](https://web.dev/offline-cookbook/) — Jake Archibald
- [web.dev: The Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
- [Caching Tutorial (Mark Nottingham)](https://www.mnot.net/cache_docs/)
- [HTTP Archive: Web Almanac 2024 — Caching Chapter](https://almanac.httparchive.org/en/2024/caching)

### Tools Gratis
| Tool | URL |
|---|---|
| PageSpeed Insights | pagespeed.web.dev |
| WebPageTest | webpagetest.org |
| GTmetrix | gtmetrix.com |
| Lighthouse | Built-in Chrome DevTools (F12) |
| Request Map | requestmap.webperf.tools |
