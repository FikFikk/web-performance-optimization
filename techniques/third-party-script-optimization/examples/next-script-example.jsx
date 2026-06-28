// next-script-example.jsx
import Script from 'next/script';
import { useState, useEffect } from 'react';

/**
 * Komponen ini menunjukkan implementasi optimasi script pihak ketiga di framework Next.js (App Router / Pages Router)
 * Menggunakan component next/script bawaan Next.js.
 */
export default function NextScriptExample() {
  const [isChatActive, setIsChatActive] = useState(false);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Next.js Third-Party Script Optimization</h1>
      
      {/* 
        A. Menggunakan Strategy 'afterInteractive' (Default)
        Cocok untuk script dasar pihak ketiga yang perlu berjalan cepat setelah interaktivitas dasar halaman siap. 
        Mencegah blocking render awal.
      */}
      <Script 
        src="https://www.google-analytics.com/analytics.js"
        strategy="afterInteractive"
        onLoad={() => console.log('Google Analytics loaded via afterInteractive')}
      />

      {/* 
        B. Menggunakan Strategy 'worker' (Partytown) - Sangat Rekomendasi untuk Analytics/Trackers 
        Ini akan offload script analytics sepenuhnya dari main thread ke Web Worker.
        Catatan: Memerlukan setup partytown di next.config.js
      */}
      <Script
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="worker"
        onLoad={() => console.log('Facebook Pixel loaded inside Web Worker')}
      />

      {/* 
        C. Menggunakan Strategy 'lazyOnload' 
        Diperuntukkan bagi script low-priority yang tidak perlu berjalan segera.
        Akan dieksekusi saat browser idle.
      */}
      <Script
        src="https://www.google.com/recaptcha/api.js"
        strategy="lazyOnload"
        onLoad={() => console.log('reCAPTCHA loaded via lazyOnload')}
      />

      {/*
        D. Custom Lazy Load On Interaction (Interaction-Triggered Script)
        Sangat cocok untuk live chat widget (Intercom, HubSpot, Zendesk, Crisp, dll)
        yang memilik beban compilasi JavaScript/DOM manipulation yang sangat tinggi.
      */}
      <div className="chat-section">
        {!isChatActive ? (
          <button 
            onClick={() => setIsChatActive(true)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}
          >
            💬 Tanya Admin (Live Chat)
          </button>
        ) : (
          <>
            {/* Hanya fetch script chat ketika pengguna mengeklik tombol placeholder chat */}
            <Script
              src="https://some-chat-widget.js/sdk.js"
              strategy="afterInteractive"
              onLoad={() => {
                console.log('Live chat SDK loaded on demand.');
                // Panggil function inisialisasi chat SDK di sini
                if (window.someChatSDK) {
                  window.someChatSDK.init({ accountId: '12345' });
                }
              }}
            />
            
            {/* Mock Chat Container */}
            <div id="real-chat-container" style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '300px',
              height: '400px',
              backgroundColor: 'white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              borderRadius: '10px',
              border: '1px solid #ccc',
              zIndex: 9999
            }}>
              <div style={{ background: '#10b981', padding: '10px', color: 'white', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                <strong>Live Support Chat</strong>
                <button onClick={() => setIsChatActive(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Close</button>
              </div>
              <div style={{ padding: '20px' }}>
                <p>Chat sedang diinisialisasi...</p>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
