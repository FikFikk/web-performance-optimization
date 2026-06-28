// partytown.config.js
/**
 * Contoh Konfigurasi Partytown.
 * Partytown adalah library pihak ketiga yang sangat powerful yang merelokasi script analytics 
 * (seperti Google Tag Manager, Facebook Pixel, Mixpanel, dll) untuk berjalan di Web Worker.
 * Ini membebaskan utas utama (Main Thread) 100% dari overhead eksekusi Javascript tersebut,
 * meningkatkan skor TBT (Total Blocking Time) dan INP (Interaction to Next Paint) secara radikal.
 */

module.exports = {
  // 1. Menentukan variable global yang akan di-forward dari Main Thread ke Web Worker.
  // Ini penting agar script analytics tetap bisa membaca API yang dipanggil di window (e.g. dataLayer.push)
  forward: ['dataLayer.push', 'fbq', '_gaq.push', 'mixpanel.track'],

  // 2. Tentukan folder di directory public web root tempat file library Partytown disimpan.
  // Partytown menggunakan service worker local ~partytown/partytown.js
  lib: '/~partytown/',

  // 3. Mengatur debug mode dalam mode development untuk melihat lifecycle script di console
  debug: false,

  // 4. Integrasi CORS Proxy Server.
  // Karena Web Worker dibatasi oleh aturan CORS untuk mengunduh script eksternal (e.g. googletagmanager.com),
  // Partytown membutuhkan reverse proxy lokal untuk mem-bypass security CORS ini.
  resolveUrl: function (url, location, type) {
    if (type === 'script') {
      const proxyUrl = new URL('https://cdn.builder.io/api/v1/proxy');
      proxyUrl.searchParams.set('url', url.href);
      return proxyUrl;
      
      // Atau bisa rute local server-side proxy Anda sendiri:
      // const localProxy = new URL('/api/cors-proxy', location.href);
      // localProxy.searchParams.set('url', url.href);
      // return localProxy;
    }
    return url;
  },

  // 5. Hooks untuk memodifikasi code script pihak ketiga sebelum dijalankan dalam sandbox Web Worker.
  getScriptDbld: function (scriptElm) {
    // Nonaktifkan eksekusi jika user menolak cookies (misalnya untuk kepatuhan GDPR/CCPA)
    if (typeof window !== 'undefined' && !window.cookiesConsentAnalyticsAllowed) {
      return true; // Script diblokir
    }
    return false;
  }
};
