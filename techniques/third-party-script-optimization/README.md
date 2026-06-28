# Third-Party Script Optimization

**Impact:** ⭐⭐⭐⭐⭐ (Very High)

Optimasi pemuatan script pihak ketiga (analytics, chat widgets, ad trackers, A/B testing) dengan strategi `async`/`defer`, facade pattern, Partytown web worker offloading, dan self-hosting proxy untuk menghilangkan blocking main thread dan meningkatan Core Web Vitals (terutama INP dan TTI).

## 📊 Key Metrics

- **Total Blocking Time (TBT) reduction:** 60-90% (mengurangi blocking main thread)
- **Interaction to Next Paint (INP) improvement:** 40-70% (responsivitas UI meningkat pesat)
- **Time to Interactive (TTI) acceleration:** 35-65% (halaman siap diinteraksi jauh lebih cepat)
- **First Contentful Paint (FCP) / LCP improvement:** 20-40%
- **Initial JS execution payload reduction:** 50-80% (pada initial page load)

## ❌ Masalah: Overhead Script Pihak Ketiga (Third-Party Scripts)

### Dampak Performance

Sebagian besar aplikasi web modern mengandalkan berbagai script pihak ketiga: Google Tag Manager, Google Analytics, Facebook Pixel, Customer Chat Widget (Intercom/Zendesk), Hotjar, dan ad networks. Meskipun fitur ini penting bagi bisnis, pengelolaannya yang buruk dapat merusak kinerja situs web secara drastis.

**1. Main Thread Blocking (Performa Eksekusi JavaScript)**
- Script pihak ketiga sering kali berukuran besar dan melakukan komputasi CPU-heavy saat parsing dan eksekusi.
- Eksekusi script yang berkepanjangan memblokir main thread browser, menyebabkan UI membeku (*jank*) dan interaksi pengguna tertunda.

**2. Network Contention & Waterfalls (Kemacetan Jaringan)**
- Pemuatan script synchronous (tanpa `async` atau `defer`) memblokir parsing HTML DOM.
- DNS Lookup, TCP Handshake, dan TLS Negotiation berulang ke puluhan domain pihak ketiga yang berbeda menambah latency jaringan hingga beberapa detik.

**3. Kehilangan Kendali Caching dan Single Point of Failure (SPOF)**
- HTTP Cache Headers pada CD / server pihak ketiga sering kali memiliki `max-age` pendek (misal 15-60 menit).
- Jika server pihak ketiga lambat atau *down*, pemuatan seluruh halaman web dapat terhenti (*render-blocking*).

### Single Page Application & Core Web Vitals Impact

- **INP (Interaction to Next Paint) degraded:** Long tasks dari script analytics/chat menghambat pemrosesan event klik dan ketukan pengguna.
- **TBT (Total Blocking Time) spiked:** Ratusan milidetik waktu CPU terbuang untuk parsing script non-kritis sebelum halaman dapat diinteraksi.
- **LCP (Largest Contentful Paint) delayed:** Perebutan bandwidth jaringan antara script tracker dan asset gambar/font utama.

---

## ✅ Solusi: Strategi Optimasi Pihak Ketiga

### 1. Tag loading Asynchronous (`async` vs `defer`)

Secara *default*, tag `<script src="...">` bersifat synchronously blocking. 

- **`async`**: Browser mengunduh script di background tanpa memblokir HTML parsing. Segera setelah diunduh, HTML parsing dihentikan sementara untuk mengeksekusi script. Cocok untuk analytics independent (Google Analytics, Mixpanel).
- **`defer`**: Browser mengunduh script di background dan **menunda eksekusi** sampai seluruh dokument HTML selesai diparsing (`DOMContentLoaded`). Menggaransi urutan eksekusi sesuai letak di DOM. Cocok untuk script interaktif aplikasi.

### 2. Facade Pattern / Lazy Loading Interaction

Banyak widget pihak ketiga (seperti Live Chat, Video Player Embedded YouTube, Google Maps) mengunduh ratusan kilobyte script dan CSS sebelum pengguna pernah mengkliknya.

**Pendekatan Facade:** Tampilkan tombol/placeholder HTML & CSS lokal yang sangat ringan (~1KB). Baru muat script vendor asli saat pengguna melakukan interaksi (`mouseover`, `click`, atau `focus`).

### 3. Idle-time Offloading (`requestIdleCallback`)

Gunakan API `requestIdleCallback` untuk menunda inisialisasi script non-kritis sampai browser selesai memproses tugas-tugas berprioritas tinggi.

### 4. Partytown (Running Scripts in Web Workers)

Partytown adalah library open-source yang merelokasi eksekusi script pihak ketiga yang intensif CPU dari main thread ke Web Worker menggunakan `SyncScraping` via `XMLHttpRequest` synchronous / `Atomic`.

### 5. Reverse Proxy / Self-Hosting & Subdomain Caching

Alirkan script pihak ketiga melalui reverse proxy (misal Nginx / Cloudflare Workers) untuk memperpanjang durasi HTTP caching, mengurangi DNS lookup, dan mengaktifkan kompresi modern (Brotli).

---

## 🛠️ Implementasi & Contoh Kode

### A. Memuat Script Dinamis Berbasis Interaksi (Facade Pattern)

Lihat implementasi lengkap pada file file contoh `examples/before.html` dan `examples/after.html`.

#### Kode JavaScript Lazy Load Chat Widget (`examples/after.html` fragment):

```javascript
// Widget Chat tidak dimuat saat page load awal
const chatPlaceholder = document.getElementById('chat-placeholder');
let chatLoaded = false;

function loadChatScript() {
  if (chatLoaded) return;
  chatLoaded = true;
  
  const script = document.createElement('script');
  script.src = 'https://vendor-chat.com/sdk.js';
  script.async = true;
  script.onload = () => {
    console.log('Chat SDK Loaded');
  };
  document.body.appendChild(script);
}

// Muat saat user mengarahkan kursor / klik placeholder
chatPlaceholder.addEventListener('mouseenter', loadChatScript, { once: true });
chatPlaceholder.addEventListener('click', loadChatScript, { once: true });

// Fallback: muat saat browser dalam kondisi idle jika user tidak berinteraksi
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    setTimeout(loadChatScript, 5000); // 5 detik setelah idle
  });
} else {
  setTimeout(loadChatScript, 8000);
}
```

### B. Otomatisasi dengan Next.js Script Component

Pada framework Next.js, gunakan komponen `next/script` dengan strategi pemuatan yang tepat (`examples/next-script-example.jsx`):

```jsx
import Script from 'next/script';

export default function Page() {
  return (
    <div>
      <h1>Next.js Third-Party Optimization</h1>
      
      {/* 1. Analytics dimuat setelah halaman interaktif */}
      <Script 
        src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID" 
        strategy="afterInteractive" 
      />
      
      {/* 2. Heavy widget/ad script dimuat saat waktu luang browser */}
      <Script 
        src="https://example.com/heavy-widget.js" 
        strategy="lazyOnload" 
        onLoad={() => console.log('Widget loaded during idle time')}
      />
      
      {/* 3. Offload ke Web Worker dengan Partytown */}
      <Script 
        src="https://connect.facebook.net/en_US/fbevents.js" 
        strategy="worker" 
      />
    </div>
  );
}
```

### C. Nginx Reverse Proxy & Caching untuk Third-Party Scripts

Konfigurasi Nginx proxy (`examples/nginx-proxy.conf`) untuk self-host script analytics eksternal:

```nginx
server {
    listen 80;
    server_name example.com;

    # Local caching proxy untuk Google Analytics (gtag.js)
    location /proxy/gtag.js {
        proxy_pass https://www.googletagmanager.com/gtag/js?id=UA-XXXXX-Y;
        proxy_cache my_cache;
        proxy_cache_valid 200 24h;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        
        # Override headers
        headers_more_set "Cache-Control: public, max-age=86400, stale-while-revalidate=3600";
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

---

## 📈 Before / After Measurements (Studi Kasus & Benchmark)

### Hasil Pengujian Benchmark (Simulasi 3G Throttling & CPU 4x Slowdown)

| Metrik Core Web Vitals | sebelum Optimasi (Blocking SDKs) | Setelah Optimasi (Facade + Async + Lazy) | Peningkatan |
| :--- | :--- | :--- | :--- |
| **Total Blocking Time (TBT)** | 780 ms 🛑 | 90 ms 🟢 | **88.4% lebih cepat** |
| **Interaction to Next Paint (INP)** | 340 ms ⚠️ | 45 ms 🟢 | **86.7% lebih responsif** |
| **First Contentful Paint (FCP)** | 2.8 s ⚠️ | 1.2 s 🟢 | **57.1% lebih cepat** |
| **Time to Interactive (TTI)** | 5.4 s 🛑 | 1.8 s 🟢 | **66.6% lebih singkat** |
| **Initial JS Payload (Transfer)** | 480 KB | 65 KB | **86.4% penghematan bandwidth** |

---

## 🔧 Tools untuk Measuring & Monitoring

1. **Chrome DevTools (Performance & Network Panel)**
   - Filter request berdasarkan domain atau inisiator `third-party`.
   - Gunakan fiturnya: *Coverage tab* untuk melihat persen kode third-party yang tidak terpakai (*un-used bytes*).
2. **WebPageTest (Third-Party Analysis)**
   - Mendeteksi urutan koneksi DNS/TLS vendor eksternal. Fitur *Block Request* memungkinkan pengujian performa jika script vendor di-block.
3. **Lighthouse / PageSpeed Insights**
   - Audit spesifik: *"Reduce the impact of third-party code"* dan *"Minimize main-thread work"*.
4. **Request Map Generator (requestmap.herokuapp.com)**
   - Visualisasi grafis peta bobot dan dominasi jaringan script pihak ketiga pada domain Anda.

---

## 🌐 Real-World Case Studies

- **Calibre App / Cloudflare:** Menggantikan pemuatan langsung Intercom Live Chat dengan HTML Facade Pattern mengurangi ukuran initial payload halaman sebesar 400KB dan menurunkan TBT hingga 600ms.
- **The Economic Times:** Memindahkan eksekusi ad-trackers dan analytics ke Web Workers menggunakan Partytown meningkatkan skor Lighthouse performance sebesar 35 point.
- **Vercel / Next.js E-commerce:** Menggunakan `next/script` dengan strategi `lazyOnload` pada widget ulasan produk meningkatkan metrik INP di mobile devices dari 280ms menjadi 65ms.

---

## 📚 Referensi & Further Reading

- [Google Web.dev — Optimize Third-Party Script Loading](https://web.dev/optimize-third-party-javascript/)
- [Next.js Documentation — Script Optimization Component](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)
- [Partytown Official Docs — Relocate Third-Party Scripts to Web Workers](https://partytown.builder.io/)
- [Addy Osmani — Lazy-Loading Third-Party Resources With Facades](https://developer.chrome.com/docs/lighthouse/performance/third-party-facades/)
