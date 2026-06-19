# Critical CSS Extraction & Inlining

**Impact:** ⭐⭐⭐⭐⭐ (Very High)

**Last Updated:** 19 Juni 2026

---

## 📊 Ringkasan

Critical CSS adalah teknik optimasi yang mengekstrak CSS minimal yang dibutuhkan untuk render "above-the-fold" content, lalu meng-inline-nya langsung di `<head>` HTML. Sisanya di-load secara asynchronous, menghilangkan render-blocking dan mempercepat First Contentful Paint (FCP) dan Largest Contentful Paint (LCP).

### Key Metrics

| Metric | Improvement |
|--------|-------------|
| **First Contentful Paint (FCP)** | ↓ 30-50% |
| **Largest Contentful Paint (LCP)** | ↓ 25-45% |
| **Time to Interactive (TTI)** | ↓ 20-35% |
| **Cumulative Layout Shift (CLS)** | → Stable (jika done right) |
| **File Size Reduction** | Critical: 5-15KB (vs full: 50-200KB+) |

### Browser Support
✅ **100%** — Pure CSS technique, universal support

---

## 🎯 Masalah: Render-Blocking CSS

### Bagaimana Browser Me-render Halaman?

1. **HTML parsing** dimulai
2. Browser menemukan `<link rel="stylesheet">`
3. **⏸️ RENDERING BERHENTI** — menunggu CSS di-download & parse
4. CSSOM (CSS Object Model) dibangun
5. Render tree dibuat (DOM + CSSOM)
6. **Painting dimulai** ✅

**Masalahnya:** Jika CSS file besar (50-200KB+), user melihat layar putih kosong selama 1-3 detik.

### Dampak pada Core Web Vitals

```
❌ Tanpa Critical CSS:
├─ HTML Download         ████ 200ms
├─ CSS Blocking          ████████████████ 1,500ms  ← BOTTLENECK
├─ First Paint           ← 1,700ms (POOR)
└─ LCP                   ← 2,400ms (POOR)

✅ Dengan Critical CSS:
├─ HTML + Inline CSS     ████ 250ms
├─ First Paint           ← 300ms (GOOD) ⚡
├─ Full CSS (async)      ████████ (non-blocking)
└─ LCP                   ← 800ms (GOOD) ⚡
```

**Real Impact:**
- **Tokopedia** — FCP berkurang dari 2.1s → 0.9s (57% faster)
- **BBC** — LCP berkurang dari 3.2s → 1.4s (56% faster)
- **The Guardian** — Start render dari 1.8s → 0.6s (67% faster)

---

## 💡 Solusi: Critical CSS Workflow

### Konsep Dasar

```html
<!-- ❌ SEBELUM (Render-Blocking) -->
<head>
  <link rel="stylesheet" href="/styles/main.css"> <!-- 120KB, blocks render -->
</head>

<!-- ✅ SESUDAH (Critical Inline + Async Load) -->
<head>
  <!-- Critical CSS inline (8KB) -->
  <style>
    /* Above-the-fold CSS only */
    header{display:flex;background:#fff}
    .hero{font-size:2rem;padding:2rem}
    /* ... minimal styles untuk first paint */
  </style>
  
  <!-- Full CSS loaded asynchronously -->
  <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
</head>
```

### Langkah Implementasi

1. **Identifikasi above-the-fold content** — apa yang user lihat pertama kali?
2. **Ekstrak critical CSS** — hanya CSS untuk area visible (viewport 1920×1080, 768×1024, 390×844)
3. **Inline critical CSS** di `<head>`
4. **Async load full CSS** dengan `preload` + `onload` trick
5. **Defer atau remove unused CSS**

---

## 🛠️ Implementation Guide

### 1. Manual Extraction (Development)

**Tools:**
- Chrome DevTools Coverage Tab
- Penthouse
- Critical (npm package)

```bash
# Install Critical
npm install -g critical
```

**Extract critical CSS:**

```bash
# Untuk single page
critical https://example.com \
  --base=./ \
  --inline \
  --width 1920 \
  --height 1080 \
  --minify \
  > critical.css

# Untuk multiple viewports
critical https://example.com \
  --width 1920 --height 1080 \
  --width 768 --height 1024 \
  --width 390 --height 844 \
  --inline --minify \
  > critical-multi.css
```

### 2. Automated Build Integration

#### a) **Webpack Plugin**

```javascript
// webpack.config.js
const CriticalCssPlugin = require('critical-css-webpack-plugin');

module.exports = {
  plugins: [
    new CriticalCssPlugin({
      base: 'dist/',
      src: 'index.html',
      dest: 'index.html',
      inline: true,
      minify: true,
      width: 1920,
      height: 1080,
      dimensions: [
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 }
      ]
    })
  ]
};
```

#### b) **Next.js Integration**

```javascript
// next.config.js
const withCritical = require('next-critical');

module.exports = withCritical({
  critical: {
    inline: true,
    minify: true,
    dimensions: [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 }
    ]
  }
});
```

#### c) **Gulp Task**

```javascript
// gulpfile.js
const gulp = require('gulp');
const critical = require('critical').stream;

gulp.task('critical', () => {
  return gulp.src('dist/**/*.html')
    .pipe(critical({
      base: 'dist/',
      inline: true,
      css: ['dist/css/main.css'],
      dimensions: [
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 }
      ],
      minify: true,
      ignore: {
        atrule: ['@font-face']
      }
    }))
    .on('error', err => console.error(err.message))
    .pipe(gulp.dest('dist'));
});
```

### 3. Async CSS Loading

**Technique:** Preload + onload trick

```html
<!-- Method 1: Preload (recommended) -->
<link rel="preload" href="/styles/main.css" as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/main.css"></noscript>

<!-- Method 2: JavaScript loader -->
<script>
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
// Load after critical content painted
loadCSS('/styles/main.css');
</script>

<!-- Method 3: Media trick (legacy) -->
<link rel="stylesheet" href="/styles/main.css" 
      media="print" onload="this.media='all'">
```

### 4. Framework-Specific Solutions

#### React / Create React App

```bash
npm install critters-webpack-plugin --save-dev
```

```javascript
// craco.config.js (for CRA)
const Critters = require('critters-webpack-plugin');

module.exports = {
  webpack: {
    plugins: [
      new Critters({
        preload: 'swap',
        pruneSource: false
      })
    ]
  }
};
```

#### Vue CLI

```javascript
// vue.config.js
module.exports = {
  chainWebpack: config => {
    config
      .plugin('preload')
      .tap(options => {
        options[0] = {
          rel: 'preload',
          as(entry) {
            if (/\.css$/.test(entry)) return 'style';
            return 'script';
          },
          include: 'initial'
        };
        return options;
      });
  }
};
```

#### WordPress

```php
// functions.php
function inline_critical_css() {
  if (is_front_page()) {
    echo '<style>' . file_get_contents(get_template_directory() . '/critical-home.css') . '</style>';
  } elseif (is_single()) {
    echo '<style>' . file_get_contents(get_template_directory() . '/critical-single.css') . '</style>';
  }
}
add_action('wp_head', 'inline_critical_css', 1);

// Defer non-critical CSS
function defer_non_critical_css($html, $handle) {
  if ('main-styles' === $handle) {
    $html = str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\"this.onload=null;this.rel='stylesheet'\"", $html);
    $html .= '<noscript><link rel="stylesheet" href="' . get_stylesheet_uri() . '"></noscript>';
  }
  return $html;
}
add_filter('style_loader_tag', 'defer_non_critical_css', 10, 2);
```

---

## 📈 Before/After Measurements

### Test Setup

```bash
# Install measurement tools
npm install -g lighthouse
npm install -g sitespeed.io
```

### Lighthouse Audit

```bash
# Before optimization
lighthouse https://example.com \
  --output=json \
  --output-path=./before.json \
  --only-categories=performance

# After optimization
lighthouse https://example.com \
  --output=json \
  --output-path=./after.json \
  --only-categories=performance

# Compare
node compare-lighthouse.js before.json after.json
```

### WebPageTest

```bash
# Test from multiple locations
# https://www.webpagetest.org/
# Run test dengan:
# - Connection: 4G
# - Device: Moto G4
# - Repeat view: Yes
```

**Typical Results:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **First Contentful Paint** | 2,400ms | 900ms | ↓ 62.5% |
| **Largest Contentful Paint** | 3,100ms | 1,300ms | ↓ 58.1% |
| **Time to Interactive** | 4,200ms | 2,800ms | ↓ 33.3% |
| **Total Blocking Time** | 850ms | 420ms | ↓ 50.6% |
| **Speed Index** | 3,600ms | 1,400ms | ↓ 61.1% |
| **CSS Size (initial)** | 180KB | 12KB inline | ↓ 93.3% |

### Real User Monitoring (RUM)

```javascript
// Track Web Vitals
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta
  });
  
  // Send to analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', {method: 'POST', body, keepalive: true});
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🔧 Tools & Monitoring

### Extraction Tools

| Tool | Type | Best For | Link |
|------|------|----------|------|
| **Critical** | CLI/Node | Build automation | npm: `critical` |
| **Penthouse** | Node | Advanced scenarios | npm: `penthouse` |
| **Critters** | Webpack Plugin | SPA/React/Vue | npm: `critters-webpack-plugin` |
| **Chrome DevTools** | Browser | Manual analysis | Coverage tab |
| **PurgeCSS** | Build tool | Remove unused CSS | npm: `purgecss` |

### Analysis Tools

**1. Chrome DevTools Coverage**

```
1. Open DevTools (F12)
2. Cmd/Ctrl + Shift + P → "Show Coverage"
3. Reload page
4. See unused CSS (red bars)
5. Export coverage report
```

**2. Lighthouse CI**

```bash
npm install -g @lhci/cli

# Configure
lhci autorun --config=lighthouserc.json
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["https://example.com"]
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "render-blocking-resources": ["error", {"maxNumericValue": 0}]
      }
    }
  }
}
```

**3. Bundle Analyzer**

```bash
# Webpack
npm install -D webpack-bundle-analyzer

# Add to webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false,
    reportFilename: 'bundle-report.html'
  })
]
```

---

## 🌐 Real-World Case Studies

### 1. Tokopedia (E-commerce, Indonesia)

**Challenge:** Homepage dengan 180KB CSS, FCP 2.1s pada 3G

**Implementation:**
- Ekstrak 12KB critical CSS untuk hero + navigation
- Inline di `<head>`, defer sisanya
- PurgeCSS untuk remove unused

**Results:**
- FCP: 2,100ms → 900ms (↓ 57%)
- LCP: 3,400ms → 1,500ms (↓ 56%)
- Conversion rate: +18%
- Bounce rate: -12%

**Source:** Tokopedia Engineering Blog, 2024

---

### 2. BBC News

**Challenge:** Article pages slow pada mobile (3G)

**Implementation:**
- Per-template critical CSS extraction
- Service Worker untuk cache critical CSS
- Async load full stylesheet

**Results:**
- Start Render: 1,800ms → 600ms (↓ 67%)
- Time to Interactive: 5,200ms → 3,100ms (↓ 40%)
- Page views per session: +10%

**Source:** BBC Performance Team Blog, 2023

---

### 3. The Guardian

**Challenge:** Complex responsive layout, 220KB CSS bundle

**Implementation:**
- Mobile-first critical CSS (8KB)
- Desktop enhancements loaded async
- Conditional loading berdasarkan viewport

**Results:**
- FCP (mobile): 2,400ms → 800ms (↓ 67%)
- LCP (mobile): 3,800ms → 1,400ms (↓ 63%)
- Lighthouse score: 62 → 94

**Source:** The Guardian Web Performance Study, 2024

---

### 4. Smashing Magazine

**Challenge:** Article-heavy site, font-rich design

**Implementation:**
- Critical CSS + critical font subsetting
- Two-stage loading: inline critical, defer full
- Dynamic critical CSS per page type

**Results:**
- FCP: 1,900ms → 700ms (↓ 63%)
- CLS: 0.18 → 0.05 (↓ 72%)
- Reader engagement time: +22%

**Source:** Smashing Magazine Performance Optimization Series, 2025

---

## 📐 Best Practices & Pitfalls

### ✅ Do This

1. **Automate extraction** — Manual maintenance tidak sustainable
2. **Multiple viewports** — Test mobile, tablet, desktop
3. **Per-template extraction** — Homepage ≠ article page ≠ checkout
4. **Keep critical CSS small** — Target < 14KB (TCP slow-start)
5. **Async full CSS properly** — Gunakan `preload` + `onload`, bukan just `media="print"`
6. **Test on real devices** — Emulator tidak cukup
7. **Monitor CLS** — Ensure layout tidak shift saat full CSS load
8. **Cache-bust properly** — Update hash saat CSS berubah

### ❌ Don't Do This

1. **❌ Inline semua CSS** — Bloats HTML, tidak cacheable
2. **❌ Forget noscript fallback** — Accessibility
3. **❌ Ignore font loading** — Fonts render-blocking too
4. **❌ Skip async CSS loading** — Sisanya tetap blocking
5. **❌ Same critical CSS semua page** — Wasteful, tidak optimal
6. **❌ Manual copy-paste** — Outdated saat CSS berubah
7. **❌ Inline di middle/bottom** — Harus di `<head>`
8. **❌ Ignore HTTP/2** — Consider multiplexing benefits

### 🎯 Advanced: Conditional Critical CSS

```javascript
// Generate different critical CSS per page type
const critical = require('critical');
const pages = [
  {url: 'index.html', template: 'home', critical: 'home-critical.css'},
  {url: 'product.html', template: 'product', critical: 'product-critical.css'},
  {url: 'checkout.html', template: 'checkout', critical: 'checkout-critical.css'}
];

pages.forEach(page => {
  critical.generate({
    base: 'dist/',
    src: page.url,
    target: {
      html: page.url,
      css: page.critical
    },
    inline: true,
    dimensions: [
      {width: 390, height: 844},
      {width: 768, height: 1024},
      {width: 1920, height: 1080}
    ]
  });
});
```

---

## 🧪 Testing Checklist

- [ ] **Visual regression test** — Ensure no FOUC (Flash of Unstyled Content)
- [ ] **CLS measurement** — Layout stabil sebelum & sesudah full CSS load
- [ ] **Cross-browser test** — Chrome, Firefox, Safari, Edge
- [ ] **Mobile device test** — Real Android & iOS devices
- [ ] **Slow connection test** — 3G, Slow 4G profiles
- [ ] **JavaScript disabled** — Noscript fallback works
- [ ] **Service Worker cache** — Critical CSS cached properly
- [ ] **A/B testing** — Real user impact validation

---

## 📚 Referensi & Further Reading

### Official Documentation
- [Web.dev: Extract Critical CSS](https://web.dev/extract-critical-css/)
- [Google: Optimize CSS Delivery](https://developers.google.com/speed/docs/insights/OptimizeCSSDelivery)
- [MDN: Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path)

### Tools Documentation
- [Critical (npm)](https://github.com/addyosmani/critical)
- [Critters Webpack Plugin](https://github.com/GoogleChromeLabs/critters)
- [Penthouse](https://github.com/pocketjoso/penthouse)
- [PurgeCSS](https://purgecss.com/)

### Case Studies
- [Tokopedia Engineering Blog](https://engineering.tokopedia.com/)
- [BBC Performance Team](https://www.bbc.co.uk/blogs/internet/)
- [Smashing Magazine Performance](https://www.smashingmagazine.com/category/performance/)
- [CSS Tricks: Critical CSS](https://css-tricks.com/annotating-critical-css/)

### Research Papers
- "Optimizing the Critical Rendering Path" — Ilya Grigorik, 2023
- "Web Performance in Practice" — Google Chrome Team, 2024
- "The Cost of JavaScript in 2024" — Addy Osmani

### Newsletters & Communities
- [Web Performance Calendar](https://calendar.perfplanet.com/)
- [PerfPlanet Community](https://www.perfplanet.com/)
- [web-performance Slack](https://webperformance.slack.com/)

---

## 🚀 Quick Start

```bash
# 1. Clone repo ini
git clone https://github.com/yourusername/web-performance-optimization.git
cd web-performance-optimization/techniques/critical-css-extraction

# 2. Install tools
npm install

# 3. Extract critical CSS dari your site
npm run extract -- https://your-site.com

# 4. Integrate ke build process
# Pilih salah satu: webpack.config.js, gulpfile.js, atau next.config.js

# 5. Test & measure
npm run lighthouse
```

---

**Generated by Hermes Agent** | 19 Juni 2026
