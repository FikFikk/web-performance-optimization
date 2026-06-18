// React component dengan Resource Hints
// File: App.jsx

import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';

function App() {
  useEffect(() => {
    // Dynamic prefetch berdasarkan user behavior
    const prefetchOnHover = (url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    };

    // Attach hover listeners untuk prefetch
    const links = document.querySelectorAll('a[data-prefetch]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const url = link.getAttribute('href');
        prefetchOnHover(url);
      }, { once: true });
    });
  }, []);

  return (
    <>
      <Helmet>
        {/* Preconnect ke critical origins */}
        <link rel="preconnect" href="https://api.example.com" />
        <link rel="preconnect" href="https://cdn.example.com" />
        
        {/* Preload hero image */}
        <link rel="preload" href="/images/hero.jpg" as="image" />
        
        {/* Preload critical font */}
        <link
          rel="preload"
          href="/fonts/primary.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* DNS prefetch untuk analytics */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </Helmet>
      
      <div className="app">
        <header className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
          <h1>Resource Hints dengan React</h1>
        </header>
        
        <main className="content">
          <h2>Navigation dengan Prefetch</h2>
          <nav>
            <a href="/about" data-prefetch>About</a>
            <a href="/products" data-prefetch>Products</a>
            <a href="/contact" data-prefetch>Contact</a>
          </nav>
          
          <p>
            Hover pada link di atas untuk trigger prefetch.
            Navigasi akan terasa lebih cepat!
          </p>
        </main>
      </div>
    </>
  );
}

export default App;
