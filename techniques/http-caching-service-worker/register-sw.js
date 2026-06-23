/**
 * register-sw.js — Registrasi Service Worker dengan fitur update notification
 * 
 * Fitur:
 * - Registrasi otomatis saat halaman load
 * - Notifikasi update versi baru
 * - Auto-reload saat koneksi kembali (dari offline)
 * - Statistik cache untuk debugging
 */

class ServiceWorkerManager {
    constructor(options = {}) {
        this.swPath = options.swPath || '/sw.js';
        this.scope = options.scope || '/';
        this.onUpdate = options.onUpdate || this.defaultUpdateNotification;
        this.registration = null;
    }

    /**
     * Daftarkan Service Worker
     */
    async register() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[SWManager] Service Worker tidak didukung browser ini');
            return null;
        }

        try {
            this.registration = await navigator.serviceWorker.register(this.swPath, {
                scope: this.scope,
                updateViaCache: 'none', // SW file sendiri tidak di-cache browser
            });

            console.log('[SWManager] SW terdaftar, scope:', this.registration.scope);

            // Setup listener untuk update
            this.setupUpdateListener();

            // Cek update ketika tab menjadi aktif kembali
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.registration.update();
                }
            });

            // Cek update setiap 60 menit (untuk long-running tabs)
            setInterval(() => {
                this.registration.update();
            }, 60 * 60 * 1000);

            return this.registration;

        } catch (error) {
            console.error('[SWManager] Registrasi gagal:', error);
            return null;
        }
    }

    /**
     * Listen untuk SW update
     */
    setupUpdateListener() {
        // Cek jika sudah ada update yang menunggu
        if (this.registration.waiting) {
            this.onUpdate(this.registration.waiting);
            return;
        }

        // Listen untuk update baru yang ditemukan
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                ) {
                    // Ada SW baru yang siap — notifikasi user
                    this.onUpdate(newWorker);
                }
            });
        });

        // Detect jika SW berubah (misalnya setelah user klik "Perbarui")
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }

    /**
     * Notifikasi update default — tampilkan banner di bawah halaman
     */
    defaultUpdateNotification(newWorker) {
        // Hapus banner lama jika ada
        const existing = document.getElementById('sw-update-banner');
        if (existing) existing.remove();

        // Buat banner baru
        const banner = document.createElement('div');
        banner.id = 'sw-update-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a73e8;
            color: white;
            padding: 14px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 90vw;
            font-family: system-ui, sans-serif;
            font-size: 14px;
        `;
        
        banner.innerHTML = `
            <span>🚀 Versi terbaru tersedia!</span>
            <button id="sw-update-btn" style="
                background: white;
                color: #1a73e8;
                border: none;
                padding: 8px 18px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                white-space: nowrap;
            ">Perbarui Sekarang</button>
            <button id="sw-dismiss-btn" style="
                background: transparent;
                color: rgba(255,255,255,0.8);
                border: 1px solid rgba(255,255,255,0.4);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
            ">Nanti</button>
        `;

        document.body.appendChild(banner);

        // Handler tombol "Perbarui"
        document.getElementById('sw-update-btn').addEventListener('click', () => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            banner.remove();
        });

        // Handler tombol "Nanti"
        document.getElementById('sw-dismiss-btn').addEventListener('click', () => {
            banner.remove();
        });

        // Auto-dismiss setelah 30 detik
        setTimeout(() => banner.remove(), 30000);
    }

    /**
     * Kirim pesan ke Service Worker
     */
    async sendMessage(type, payload) {
        if (!this.registration?.active) {
            throw new Error('Service Worker belum aktif');
        }

        return new Promise((resolve, reject) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => resolve(event.data);
            channel.port1.onmessageerror = reject;
            this.registration.active.postMessage({ type, payload }, [channel.port2]);
        });
    }

    /**
     * Dapatkan statistik cache (untuk debugging)
     */
    async getCacheStats() {
        return this.sendMessage('GET_CACHE_STATS');
    }

    /**
     * Hapus semua cache
     */
    async clearAllCaches() {
        return this.sendMessage('CLEAR_CACHE');
    }

    /**
     * Unregister Service Worker
     */
    async unregister() {
        if (!this.registration) return false;
        const success = await this.registration.unregister();
        console.log('[SWManager] SW unregistered:', success);
        return success;
    }
}

// ============================================================
// OFFLINE/ONLINE DETECTION
// ============================================================

function setupConnectivityListener() {
    let offlineBanner = null;

    window.addEventListener('offline', () => {
        if (offlineBanner) return;

        offlineBanner = document.createElement('div');
        offlineBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f44336;
            color: white;
            text-align: center;
            padding: 10px;
            z-index: 99999;
            font-family: system-ui, sans-serif;
            font-size: 14px;
        `;
        offlineBanner.textContent = '📡 Kamu sedang offline — konten mungkin tidak terbaru';
        document.body.prepend(offlineBanner);

        console.log('[App] Koneksi terputus');
    });

    window.addEventListener('online', () => {
        if (offlineBanner) {
            offlineBanner.style.background = '#4caf50';
            offlineBanner.textContent = '✅ Koneksi kembali!';
            setTimeout(() => {
                offlineBanner?.remove();
                offlineBanner = null;
            }, 3000);
        }

        console.log('[App] Koneksi kembali');
    });
}

// ============================================================
// INISIALISASI
// ============================================================

/**
 * Jalankan setelah halaman load
 */
window.addEventListener('load', async () => {
    // Setup connectivity detection
    setupConnectivityListener();

    // Daftarkan Service Worker
    const manager = new ServiceWorkerManager({
        swPath: '/sw.js',
        scope: '/',
        // Custom update handler (opsional — bisa override):
        // onUpdate: (newWorker) => { ... }
    });

    const registration = await manager.register();

    // Expose ke global untuk debugging di console
    if (process.env.NODE_ENV !== 'production') {
        window.__swManager = manager;
        console.log('[App] SW Manager tersedia di window.__swManager');
        console.log('[App] Gunakan window.__swManager.getCacheStats() untuk melihat cache');
    }

    return registration;
});

export default ServiceWorkerManager;
