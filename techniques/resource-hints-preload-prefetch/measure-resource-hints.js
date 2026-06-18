// Script untuk mengukur efektivitas Resource Hints
// File: measure-resource-hints.js

const { performance, PerformanceObserver } = require('perf_hooks');

class ResourceHintsMeasurement {
  constructor() {
    this.metrics = {
      preconnect: [],
      preload: [],
      prefetch: [],
      totalResources: 0
    };
  }

  // Measure preconnect effectiveness
  measurePreconnect(url) {
    const startTime = performance.now();
    
    // Simulate connection timing
    return new Promise((resolve) => {
      setTimeout(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.preconnect.push({
          url,
          duration,
          saved: duration * 0.6 // Estimasi waktu tersimpan
        });
        
        resolve(duration);
      }, Math.random() * 100 + 50);
    });
  }

  // Measure preload effectiveness
  measurePreload(resource) {
    const entry = {
      name: resource.name,
      type: resource.type,
      startTime: performance.now(),
      priority: resource.priority || 'high'
    };
    
    this.metrics.preload.push(entry);
    return entry;
  }

  // Measure prefetch effectiveness
  measurePrefetch(url) {
    const entry = {
      url,
      startTime: performance.now(),
      status: 'pending'
    };
    
    this.metrics.prefetch.push(entry);
    return entry;
  }

  // Generate report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPreconnects: this.metrics.preconnect.length,
        totalPreloads: this.metrics.preload.length,
        totalPrefetches: this.metrics.prefetch.length,
        estimatedTimeSaved: this.calculateTimeSaved()
      },
      details: this.metrics
    };
    
    return report;
  }

  calculateTimeSaved() {
    const preconnectSaved = this.metrics.preconnect.reduce(
      (sum, item) => sum + item.saved, 
      0
    );
    
    const preloadSaved = this.metrics.preload.length * 150; // Avg 150ms per preload
    
    return Math.round(preconnectSaved + preloadSaved);
  }

  // Pretty print report
  printReport() {
    const report = this.generateReport();
    
    console.log('\n=== Resource Hints Performance Report ===\n');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`\nSummary:`);
    console.log(`  Preconnects: ${report.summary.totalPreconnects}`);
    console.log(`  Preloads: ${report.summary.totalPreloads}`);
    console.log(`  Prefetches: ${report.summary.totalPrefetches}`);
    console.log(`  Estimated Time Saved: ${report.summary.estimatedTimeSaved}ms`);
    
    if (report.details.preconnect.length > 0) {
      console.log(`\nPreconnect Details:`);
      report.details.preconnect.forEach(item => {
        console.log(`  ${item.url}: ${Math.round(item.duration)}ms (saved ~${Math.round(item.saved)}ms)`);
      });
    }
    
    if (report.details.preload.length > 0) {
      console.log(`\nPreload Details:`);
      report.details.preload.forEach(item => {
        console.log(`  ${item.name} (${item.type}): priority=${item.priority}`);
      });
    }
    
    console.log('\n=========================================\n');
  }
}

// Browser-side measurement (untuk copy ke browser console)
const browserMeasurement = `
// Copy script ini ke browser console untuk measure resource hints

class ResourceHintsMonitor {
  constructor() {
    this.init();
  }
  
  init() {
    // Monitor LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      console.log('LCP:', {
        element: lastEntry.element,
        renderTime: Math.round(lastEntry.renderTime || lastEntry.loadTime) + 'ms',
        url: lastEntry.url
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Monitor resource loading
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      
      console.group('Resource Hints Analysis');
      
      // Group by type
      const byType = resources.reduce((acc, r) => {
        const type = this.getResourceType(r.name);
        if (!acc[type]) acc[type] = [];
        acc[type].push(r);
        return acc;
      }, {});
      
      // Analyze each type
      Object.entries(byType).forEach(([type, items]) => {
        console.group(type + ' (' + items.length + ')');
        
        items.forEach(r => {
          const timing = {
            name: r.name.split('/').pop(),
            duration: Math.round(r.duration) + 'ms',
            dns: Math.round(r.domainLookupEnd - r.domainLookupStart) + 'ms',
            tcp: Math.round(r.connectEnd - r.connectStart) + 'ms',
            ttfb: Math.round(r.responseStart - r.requestStart) + 'ms'
          };
          
          console.log(timing);
        });
        
        console.groupEnd();
      });
      
      // Check for preload warnings
      const preloads = Array.from(document.querySelectorAll('link[rel="preload"]'));
      const usedPreloads = resources.map(r => r.name);
      
      console.group('Preload Validation');
      preloads.forEach(link => {
        const href = link.href;
        const used = usedPreloads.some(url => url.includes(href) || href.includes(url));
        
        console.log({
          href: href.split('/').pop(),
          used: used ? '✅ Used' : '❌ Not used',
          as: link.as
        });
      });
      console.groupEnd();
      
      console.groupEnd();
    });
  }
  
  getResourceType(url) {
    if (url.includes('.woff') || url.includes('.ttf')) return 'fonts';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) return 'images';
    if (url.includes('.css')) return 'stylesheets';
    if (url.includes('.js')) return 'scripts';
    return 'other';
  }
}

// Start monitoring
new ResourceHintsMonitor();
console.log('Resource Hints Monitor started. Check console after page load.');
`;

// Export untuk Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResourceHintsMeasurement, browserMeasurement };
}

// Example usage
if (require.main === module) {
  const measurement = new ResourceHintsMeasurement();
  
  // Simulate measurements
  Promise.all([
    measurement.measurePreconnect('https://fonts.googleapis.com'),
    measurement.measurePreconnect('https://cdn.example.com'),
  ]).then(() => {
    measurement.measurePreload({ name: 'hero.jpg', type: 'image', priority: 'high' });
    measurement.measurePreload({ name: 'main.woff2', type: 'font', priority: 'high' });
    measurement.measurePrefetch('/products.html');
    
    measurement.printReport();
  });
}
