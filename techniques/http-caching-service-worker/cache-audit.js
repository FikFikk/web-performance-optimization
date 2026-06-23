#!/usr/bin/env node
/**
 * cache-audit.js — Script untuk audit cache headers website
 * 
 * Cara pakai:
 *   node cache-audit.js https://example.com
 *   node cache-audit.js https://example.com --verbose
 * 
 * Output: laporan lengkap cache headers untuk semua resource
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============================================================
// KONFIGURASI
// ============================================================

const IMPORTANT_CACHE_HEADERS = [
    'cache-control',
    'etag',
    'last-modified',
    'expires',
    'vary',
    'age',
    'x-cache',
    'cf-cache-status',    // Cloudflare
    'x-vercel-cache',     // Vercel
    'x-cache-status',     // Custom
];

// Assessment rules
const CACHE_RULES = [
    {
        name: 'Aset JS/CSS harus cache minimal 1 bulan',
        test: (url, headers) => {
            if (!url.match(/\.(js|css)$/)) return null; // skip
            const cc = headers['cache-control'] || '';
            const maxAge = extractMaxAge(cc);
            if (!maxAge) return { pass: false, message: 'Tidak ada Cache-Control max-age' };
            if (maxAge < 30 * 24 * 3600) return {
                pass: false,
                message: `max-age=${maxAge}s terlalu pendek (minimum 2592000s = 30 hari)`
            };
            return { pass: true, message: `max-age=${maxAge}s ✓` };
        }
    },
    {
        name: 'Aset dengan hash harus immutable',
        test: (url, headers) => {
            if (!url.match(/\.[a-f0-9]{6,12}\.(js|css|woff2?)$/)) return null;
            const cc = headers['cache-control'] || '';
            if (!cc.includes('immutable')) return {
                pass: false,
                message: 'Aset dengan hash harus memiliki "immutable"'
            };
            return { pass: true, message: 'immutable ✓' };
        }
    },
    {
        name: 'HTML tidak boleh cache lama',
        test: (url, headers) => {
            if (!url.match(/\.(html)$/) && !url.endsWith('/')) return null;
            const cc = headers['cache-control'] || '';
            const maxAge = extractMaxAge(cc);
            if (maxAge && maxAge > 3600) return {
                pass: false,
                message: `HTML di-cache terlalu lama (${maxAge}s) — gunakan no-cache`
            };
            return { pass: true, message: 'HTML cache pendek/no-cache ✓' };
        }
    },
    {
        name: 'Gambar harus ada cache',
        test: (url, headers) => {
            if (!url.match(/\.(png|jpg|jpeg|webp|avif|gif|svg)$/i)) return null;
            const cc = headers['cache-control'] || '';
            if (!cc || cc.includes('no-store')) return {
                pass: false,
                message: 'Gambar tanpa cache — tambahkan Cache-Control'
            };
            return { pass: true, message: 'Gambar di-cache ✓' };
        }
    },
    {
        name: 'Font harus ada cache panjang',
        test: (url, headers) => {
            if (!url.match(/\.(woff2?|ttf|eot|otf)$/i)) return null;
            const cc = headers['cache-control'] || '';
            const maxAge = extractMaxAge(cc);
            if (!maxAge || maxAge < 7 * 24 * 3600) return {
                pass: false,
                message: 'Font harus cache minimal 7 hari'
            };
            return { pass: true, message: `Font cache ${Math.round(maxAge / 86400)}d ✓` };
        }
    },
    {
        name: 'ETag atau Last-Modified tersedia',
        test: (url, headers) => {
            const etag = headers['etag'];
            const lastModified = headers['last-modified'];
            if (!etag && !lastModified) return {
                pass: false,
                message: 'Tidak ada ETag atau Last-Modified — revalidation tidak optimal'
            };
            return {
                pass: true,
                message: `${etag ? 'ETag ✓' : ''}${lastModified ? ' Last-Modified ✓' : ''}`
            };
        }
    },
];

// ============================================================
// HELPERS
// ============================================================

function extractMaxAge(cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    if (seconds >= 365 * 86400) return `${Math.round(seconds / 365 / 86400)}y`;
    if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`;
    if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
    if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
    return `${seconds}s`;
}

function fetchHeaders(urlString) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const lib = url.protocol === 'https:' ? https : http;

        const req = lib.request(url, { method: 'HEAD' }, (res) => {
            resolve({
                url: urlString,
                status: res.statusCode,
                headers: res.headers,
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error(`Timeout: ${urlString}`));
        });

        req.end();
    });
}

// ============================================================
// AUDIT UTAMA
// ============================================================

async function auditCacheHeaders(baseUrl, options = {}) {
    const { verbose = false } = options;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           CACHE HEADERS AUDIT TOOL                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n🔍 Mengaudit: ${baseUrl}\n`);

    // Fetch halaman utama dulu untuk dapat list resource
    const mainResult = await fetchHeaders(baseUrl);
    
    console.log(`📄 Halaman Utama (${baseUrl})`);
    console.log(`   Status: ${mainResult.status}`);
    console.log(`   Cache-Control: ${mainResult.headers['cache-control'] || '(tidak ada)'}`);
    console.log(`   ETag: ${mainResult.headers['etag'] || '(tidak ada)'}`);
    console.log(`   Last-Modified: ${mainResult.headers['last-modified'] || '(tidak ada)'}`);

    // Jalankan rules terhadap halaman utama
    let totalPass = 0, totalFail = 0, totalSkip = 0;
    
    runRules(baseUrl, mainResult.headers, verbose);

    // Resource umum yang sering diaudit
    const commonResources = [
        '/favicon.ico',
        '/robots.txt',
        '/manifest.webmanifest',
        '/sw.js',
    ];

    console.log('\n📦 Mengaudit resource umum...\n');
    
    for (const resource of commonResources) {
        const resourceUrl = new URL(resource, baseUrl).toString();
        try {
            const result = await fetchHeaders(resourceUrl);
            const cc = result.headers['cache-control'] || '(tidak ada)';
            const maxAge = extractMaxAge(cc);
            const duration = formatDuration(maxAge);

            const statusIcon = result.status === 200 ? '✅' : result.status === 404 ? '⚠️' : '❓';
            console.log(`${statusIcon} ${resource}`);
            console.log(`   Cache-Control: ${cc}`);
            if (maxAge) console.log(`   Duration: ${duration}`);
            
        } catch (err) {
            console.log(`❌ ${resource} — Gagal (${err.message})`);
        }
    }

    // Summary dan saran
    console.log('\n');
    console.log('════════════════════════════════════════');
    console.log('📊 RINGKASAN REKOMENDASI');
    console.log('════════════════════════════════════════\n');
    
    const recommendations = [
        {
            title: 'Gunakan Content Hashing untuk Aset Statis',
            detail: 'webpack: output.filename = "[name].[contenthash:8].js"',
            command: 'npm install --save-dev webpack'
        },
        {
            title: 'Set Cache-Control immutable untuk Aset Hashed',
            detail: 'nginx: add_header Cache-Control "public, max-age=31536000, immutable"',
            command: null
        },
        {
            title: 'Implementasikan Service Worker',
            detail: 'Gunakan Workbox: npm install workbox-webpack-plugin',
            command: 'npm install workbox-webpack-plugin workbox-window'
        },
        {
            title: 'Aktifkan Brotli/Gzip Compression',
            detail: 'Hemat 60-80% ukuran transfer untuk teks',
            command: null
        },
        {
            title: 'Deploy ke CDN',
            detail: 'Cloudflare (gratis), Vercel, Netlify, AWS CloudFront',
            command: null
        },
    ];

    recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. 💡 ${rec.title}`);
        console.log(`   → ${rec.detail}`);
        if (rec.command) console.log(`   $ ${rec.command}`);
        console.log('');
    });

    console.log('════════════════════════════════════════');
    console.log('📖 Referensi: https://web.dev/http-cache/');
    console.log('📖 Workbox: https://developer.chrome.com/docs/workbox/');
    console.log('════════════════════════════════════════\n');
}

function runRules(url, headers, verbose) {
    if (!verbose) return;
    
    console.log('\n🔬 Rule Checks:');
    for (const rule of CACHE_RULES) {
        const result = rule.test(url, headers);
        if (result === null) continue; // Skip rule ini

        const icon = result.pass ? '  ✅' : '  ❌';
        console.log(`${icon} ${rule.name}`);
        if (!result.pass) {
            console.log(`     → ${result.message}`);
        }
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log('Usage: node cache-audit.js <url> [--verbose]');
        console.log('');
        console.log('Contoh:');
        console.log('  node cache-audit.js https://example.com');
        console.log('  node cache-audit.js https://example.com --verbose');
        process.exit(0);
    }

    const url = args[0];
    const verbose = args.includes('--verbose') || args.includes('-v');

    try {
        await auditCacheHeaders(url, { verbose });
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
