// Next.js custom _document.js untuk Resource Hints
// File: pages/_document.js

import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="id">
        <Head>
          {/* Preconnect ke third-party origins */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://cdn.example.com" />
          
          {/* DNS prefetch untuk analytics */}
          <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          
          {/* Preload critical fonts */}
          <link
            rel="preload"
            href="/fonts/inter-var.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          
          {/* Preload critical CSS (jika ada inline critical CSS) */}
          <link rel="preload" href="/css/critical.css" as="style" />
          
          {/* Google Fonts dengan preconnect sudah diset */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
