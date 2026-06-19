/**
 * Web Vitals Monitoring Script
 * 
 * Measures and reports Core Web Vitals in real-time
 * Usage: Include this script in your HTML
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Configuration
const config = {
  // Analytics endpoint
  endpoint: '/api/analytics',
  
  // Send beacon or fetch
  useBeacon: true,
  
  // Sample rate (0-1, where 1 = 100%)
  sampleRate: 1.0,
  
  // Debug mode
  debug: false
};

// Metric thresholds (from Google)
const thresholds = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 }
};

// Get rating based on thresholds
function getRating(name, value) {
  const threshold = thresholds[name.toLowerCase()];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Send metric to analytics
function sendToAnalytics(metric) {
  // Check sample rate
  if (Math.random() > config.sampleRate) return;
  
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'navigate',
    
    // Additional context
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: navigator.connection?.effectiveType || 'unknown',
    timestamp: Date.now()
  });
  
  if (config.debug) {
    console.log('📊 Web Vital:', metric.name, metric.value, metric.rating);
  }
  
  // Send to server
  if (config.useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(config.endpoint, body);
  } else {
    fetch(config.endpoint, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(err => {
      if (config.debug) console.error('Analytics error:', err);
    });
  }
}

// Handle metric with rating
function handleMetric(metric) {
  metric.rating = getRating(metric.name, metric.value);
  sendToAnalytics(metric);
  
  // Log to console in debug mode
  if (config.debug) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(0)}ms (${metric.rating})`);
  }
}

// Initialize Web Vitals tracking
export function initWebVitals(options = {}) {
  Object.assign(config, options);
  
  getCLS(handleMetric);
  getFID(handleMetric);
  getFCP(handleMetric);
  getLCP(handleMetric);
  getTTFB(handleMetric);
  
  if (config.debug) {
    console.log('📊 Web Vitals monitoring initialized');
  }
}

// Track page visibility changes
let hidden;
let visibilityChange;

if (typeof document.hidden !== 'undefined') {
  hidden = 'hidden';
  visibilityChange = 'visibilitychange';
} else if (typeof document.msHidden !== 'undefined') {
  hidden = 'msHidden';
  visibilityChange = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
  hidden = 'webkitHidden';
  visibilityChange = 'webkitvisibilitychange';
}

// Send final metrics when page is hidden
if (visibilityChange) {
  document.addEventListener(visibilityChange, () => {
    if (document[hidden]) {
      // Page is being hidden, send final metrics
      getCLS(handleMetric, { reportAllChanges: true });
      getLCP(handleMetric, { reportAllChanges: true });
    }
  });
}

// Auto-initialize if not using as module
if (typeof window !== 'undefined' && !window.__webVitalsInitialized) {
  window.__webVitalsInitialized = true;
  initWebVitals();
}
