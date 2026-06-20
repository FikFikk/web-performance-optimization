// reportWebVitals.js - Monitor Core Web Vitals
export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Dynamic import web-vitals library
    import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB, onINP }) => {
      onCLS(onPerfEntry);
      onFCP(onPerfEntry);
      onFID(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
      onINP(onPerfEntry); // New Core Web Vital (2024)
    });
  }
}

// Advanced: Send to analytics
export function sendToAnalytics({ name, value, id, delta }) {
  // Send to your analytics endpoint
  const body = JSON.stringify({ name, value, id, delta });
  
  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(console.error);
  }

  console.log(`📊 ${name}:`, value, 'ms');
}
