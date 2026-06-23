// vite.config.js — Konfigurasi lengkap Vite dengan PWA & caching strategy
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Ganti sesuai framework
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        
        VitePWA({
            // SW otomatis diperbarui + langsung aktif
            registerType: 'autoUpdate',
            
            // Inlinekita SW source — cocok untuk kustomisasi rendah
            // Untuk kontrol penuh, gunakan 'injectManifest' + sw.js kustom
            strategies: 'generateSW',
            
            // Precache semua file di output Vite
            includeAssets: [
                'favicon.ico',
                'favicon.svg',
                'apple-touch-icon.png',
                'robots.txt',
                'offline.html',
            ],
            
            // Web App Manifest untuk PWA
            manifest: {
                name: 'My Performance App',
                short_name: 'PerfApp',
                description: 'Aplikasi dengan web performance optimal',
                theme_color: '#1a73e8',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                lang: 'id',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
                shortcuts: [
                    {
                        name: 'Beranda',
                        url: '/',
                        icons: [{ src: '/icons/home.png', sizes: '96x96' }],
                    },
                ],
            },
            
            workbox: {
                // Glob patterns untuk precaching (otomatis dari Vite output)
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,avif}'],
                
                // Jangan precache file besar (> 3MB)
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                
                // Runtime caching strategies
                runtimeCaching: [
                    // ---- Google Fonts ----
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'google-fonts-stylesheets',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-webfonts',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
                            },
                            cacheableResponse: { statuses: [0, 200] }, // Opaque dan OK
                        },
                    },
                    
                    // ---- CDN Assets (Bootstrap, jQuery, dll) ----
                    {
                        urlPattern: /^https:\/\/(cdn\.|unpkg\.com|cdnjs\.cloudflare\.com)\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-assets',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 hari
                            },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    
                    // ---- Gambar eksternal ----
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
                            },
                        },
                    },
                    
                    // ---- API: Product catalog (stale-while-revalidate) ----
                    {
                        urlPattern: /^https:\/\/api\.example\.com\/products/i,
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
                    
                    // ---- API: User data (network first, private) ----
                    {
                        urlPattern: /^https:\/\/api\.example\.com\/user/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-user',
                            networkTimeoutSeconds: 5,
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60, // 1 jam
                            },
                            cacheableResponse: { statuses: [200] },
                        },
                    },
                    
                    // ---- Static API data (jarang berubah) ----
                    {
                        urlPattern: /^https:\/\/api\.example\.com\/static/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'api-static',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24, // 1 hari
                            },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    
                    // ---- HTML Pages (navigasi) ----
                    {
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'pages-cache',
                            networkTimeoutSeconds: 3,
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24, // 1 hari
                            },
                        },
                    },
                ],
                
                // Offline fallback
                offlineGoogleAnalytics: true,
                
                // Navigasi fallback ke index.html (SPA)
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/, /sw\.js$/],
            },
            
            // Dev options
            devOptions: {
                enabled: true,           // Aktifkan SW di development juga
                type: 'module',
            },
        }),
    ],
    
    build: {
        // Content hashing otomatis di Vite 4+
        rollupOptions: {
            output: {
                // Vendor chunk terpisah untuk cache lebih lama
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // Pisahkan library besar
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'react-vendor';
                        }
                        if (id.includes('lodash') || id.includes('date-fns')) {
                            return 'utils-vendor';
                        }
                        return 'vendor';
                    }
                },
                // Format nama dengan hash
                chunkFileNames: 'js/[name]-[hash].js',
                entryFileNames: 'js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.');
                    const ext = info[info.length - 1];
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
                        return `images/[name]-[hash][extname]`;
                    }
                    if (/woff2?|ttf|eot|otf/i.test(ext)) {
                        return `fonts/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                },
            },
        },
    },
});
