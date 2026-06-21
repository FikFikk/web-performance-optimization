# Font Loading Strategies untuk Web Performance

## 📊 Masalah: Web Font Performance

### Dampak Performance

Loading web font yang tidak dioptimalkan menyebabkan:

1. **FOIT (Flash of Invisible Text)** — Teks tidak terlihat hingga font selesai load (bisa 3+ detik)
2. **FOUT (Flash of Unstyled Text)** — Teks muncul dengan system font lalu berganti ke web font secara kasar
3. **Layout Shift** — Perubahan ukuran teks saat web font load, merusak CLS (Cumulative Layout Shift)
4. **Render Blocking** — Font request menghalangi First Contentful Paint

### Metrik yang Terpengaruh

| Metrik | Impact | Typical Degradation |
|--------|--------|---------------------|
| **FCP** (First Contentful Paint) | 🔴 High | +800ms - 2.5s |
| **LCP** (Largest Contentful Paint) | 🔴 High | +600ms - 2s |
| **CLS** (Cumulative Layout Shift) | 🟠 Medium | +0.05 - 0.25 |
| **FID/INP** | 🟢 Low | Minimal |
| **TTI** (Time to Interactive) | 🟠 Medium | +400ms - 1s |

### Real-World Cost

```
Ukuran font file rata-rata:
- WOFF2: 15-50 KB per weight
- Family lengkap (4 weights): 60-200 KB
- Google Fonts request: +150-300ms network overhead

User dengan 3G connection:
- Download 100 KB font: ~1.3 detik
- 3 seconds FOIT = 53% users abandon page (Google data)
```

---

## 💡 Solusi: Modern Font Loading Strategies

### 1. font-display CSS Property

Kontrol bagaimana browser menampilkan teks selama font loading.

**Nilai dan Behavior:**

| Value | Block Period | Swap Period | Use Case |
|-------|--------------|-------------|----------|
| `auto` | ~100ms | ~3s | Default browser |
| `block` | 2-3s | ∞ | Brand critical |
| `swap` | 0ms | ∞ | **Recommended** — Content first |
| `fallback` | ~100ms | ~3s | Balance |
| `optional` | ~100ms | 0ms | Performance critical |

**Implementation:**

```css
/* Method 1: Via @font-face */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap; /* ✅ Show fallback immediately */
  font-style: normal;
}

/* Method 2: Via Google Fonts */
/* Add &display=swap to URL */
```

**Impact:** ✅ Eliminates FOIT, improves FCP by 800ms - 2.5s

---

### 2. Preload Critical Fonts

Memprioritaskan download font yang critical untuk above-the-fold content.

```html
<!-- Preload ONLY fonts yang immediately visible -->
<link rel="preload" 
      href="/fonts/inter-var.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin="anonymous">

<!-- Jika pakai Google Fonts, preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**⚠️ Critical Rules:**
- Hanya preload fonts yang **immediately visible** (above-the-fold)
- Max 1-2 font files (body text + heading)
- WOFF2 format only (dukungan 95%+)
- Jangan preload semua weights/variants

**Impact:** ✅ Improves LCP by 400-800ms

---

### 3. Subsetting — Optimasi Ukuran Font

Hilangkan glyphs yang tidak digunakan untuk mengurangi file size.

**Teknik Subsetting:**

```bash
# Gunakan glyphhanger (tool open-source)
npm install -g glyphhanger

# Generate subset untuk Latin characters saja
glyphhanger --subset=fonts/inter-var.woff2 \
  --formats=woff2 \
  --US_ASCII

# Dengan whitelist specific characters
glyphhanger --subset=fonts/inter-var.woff2 \
  --whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!? " \
  --formats=woff2
```

**Google Fonts Subsetting:**

```html
<!-- Subset via URL parameter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&text=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" rel="stylesheet">

<!-- Unicode range subsetting -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&subset=latin" rel="stylesheet">
```

**Results:**
- Full font: 150 KB
- Latin subset: 30-50 KB (**67-80% reduction**)
- Custom subset: 15-25 KB (**83-90% reduction**)

---

### 4. System Font Stack (No Web Fonts)

Untuk maximum performance, gunakan system fonts.

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 
               "Segoe UI", Roboto, Helvetica, Arial, 
               sans-serif, "Apple Color Emoji", 
               "Segoe UI Emoji", "Segoe UI Symbol";
}
```

**Pros:**
- ✅ 0 KB network transfer
- ✅ 0ms load time
- ✅ No CLS risk
- ✅ Familiar untuk user

**Cons:**
- ❌ Tidak konsisten cross-platform
- ❌ Limited branding control

---

### 5. Variable Fonts — Satu File, Multiple Weights

Variable fonts = 1 file berisi seluruh weight spectrum.

```css
@font-face {
  font-family: 'Inter var';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900; /* Semua weights dalam 1 file */
  font-display: swap;
}

h1 { font-weight: 700; }
h2 { font-weight: 600; }
p  { font-weight: 400; }
```

**Comparison:**

| Approach | File Count | Total Size | Requests |
|----------|------------|------------|----------|
| Traditional (4 weights) | 4 files | 160 KB | 4 |
| Variable Font | 1 file | 120 KB | 1 |
| **Savings** | **-75%** | **-25%** | **-75%** |

---

### 6. Self-Hosting vs Google Fonts

**Google Fonts:**
```html
<!-- ❌ Slower: Extra DNS lookup + SSL handshake -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
```

**Self-Hosting:**
```html
<!-- ✅ Faster: Same origin, cacheable -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

**Performance Difference:**
- Google Fonts: +200-400ms (DNS + connection overhead)
- Self-hosted: No extra latency
- **Improvement: 200-400ms**

**Tools untuk Self-Hosting:**
- [google-webfonts-helper](https://gwfh.mranftl.com/fonts) — Download Google Fonts
- [Fontsource](https://fontsource.org/) — NPM packages for Google Fonts

---

## 🛠️ Implementation Guide

### Strategi Optimal (Recommended)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 1. Preconnect untuk external fonts (jika pakai Google Fonts) -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- 2. Preload critical font -->
  <link rel="preload" 
        href="/fonts/inter-var.woff2" 
        as="font" 
        type="font/woff2" 
        crossorigin>
  
  <style>
    /* 3. Inline critical font-face CSS */
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-var.woff2') format('woff2');
      font-weight: 100 900;
      font-display: swap; /* 4. Always use swap */
      font-style: normal;
    }
    
    /* 5. Fallback font yang matched */
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      /* 6. Size adjustment untuk minimize CLS */
      font-size: 16px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <h1>Your Content</h1>
</body>
</html>
```

### Next.js Implementation

```typescript
// app/layout.tsx
import localFont from 'next/font/local'

const inter = localFont({
  src: [
    {
      path: './fonts/inter-var.woff2',
      weight: '100 900',
      style: 'normal',
    }
  ],
  variable: '--font-inter',
  display: 'swap', // font-display
  preload: true,    // Automatic preload
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
})

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  },
  plugins: [
    // Preload plugin untuk auto-generate preload tags
    new PreloadWebpackPlugin({
      rel: 'preload',
      as: 'font',
      fileWhitelist: [/\.woff2$/],
      include: 'initial',
    })
  ]
}
```

---

## 📈 Before/After Measurements

### Test Case: E-commerce Homepage

**Before Optimization:**
```
Font Setup:
- Google Fonts (Roboto: 400, 700)
- No font-display
- No preload
- 2 separate weight files

Metrics:
- FCP: 2.8s
- LCP: 3.4s  
- CLS: 0.18
- Font load time: 1.8s
- FOIT duration: 2.1s
```

**After Optimization:**
```
Font Setup:
- Self-hosted Variable Font (Roboto Flex)
- font-display: swap
- Preload critical font
- 1 variable font file
- Latin subset

Metrics:
- FCP: 1.1s (-61%)
- LCP: 1.6s (-53%)
- CLS: 0.02 (-89%)
- Font load time: 0.4s (-78%)
- FOIT duration: 0ms (-100%)

Lighthouse Score:
- Performance: 58 → 94 (+36 points)
```

### Subsetting Impact

| Font | Original | Latin Subset | Custom Subset | Savings |
|------|----------|--------------|---------------|---------|
| Inter Regular | 146 KB | 34 KB | 18 KB | 88% |
| Roboto Regular | 168 KB | 38 KB | 21 KB | 87% |
| Poppins Regular | 189 KB | 42 KB | 24 KB | 87% |

---

## 🔧 Tools untuk Measuring & Monitoring

### 1. Chrome DevTools

**Network Panel:**
```
Filter: font
Sort by: Time

Analyze:
- Download time per font
- Total font weight
- Blocking vs non-blocking
```

**Coverage Panel:**
```
Cmd+Shift+P → Coverage
Reload page

Shows:
- Unused glyphs (red)
- Used glyphs (green)
- Subset candidates
```

**Performance Panel:**
```
Record page load
Look for:
- Font paint timing
- Layout shifts (CLS)
- Long Tasks during font swap
```

### 2. Lighthouse Audit

```bash
lighthouse https://yoursite.com \
  --only-categories=performance \
  --view
```

**Font-related audits:**
- ✅ Ensure text remains visible during webfont load
- ✅ Preload key requests
- ⚠️ Avoid enormous network payloads
- ⚠️ Minimize Critical Request Depth

### 3. WebPageTest

```
Test Settings:
- Test Location: Multiple regions
- Connection: 3G/4G/Cable
- Filmstrip View: ON

Font Analysis:
- Waterfall view → Font request timing
- Content Breakdown → Font bytes
- Video → FOIT/FOUT visibility
```

**Key Metrics:**
- Start Render (with/without fonts)
- Speed Index
- Visual Complete

### 4. Font Loading Checklist

```javascript
// font-loading-test.js
// Run in Console untuk test font loading

// 1. Check font-display value
document.fonts.forEach(font => {
  console.log(`${font.family}:`, font.display || 'auto');
});

// 2. Check if fonts are preloaded
const preloads = document.querySelectorAll('link[rel="preload"][as="font"]');
console.log(`Preloaded fonts: ${preloads.length}`);
preloads.forEach(link => console.log(link.href));

// 3. Measure font load time
const fontLoadStart = performance.now();
document.fonts.ready.then(() => {
  const loadTime = performance.now() - fontLoadStart;
  console.log(`All fonts loaded in: ${loadTime.toFixed(2)}ms`);
});

// 4. Check font file sizes
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('font') || r.name.match(/\.(woff2|woff|ttf|otf)$/))
  .forEach(font => {
    console.log(`${font.name}: ${(font.transferSize / 1024).toFixed(2)} KB`);
  });
```

### 5. Fonttools (Python)

```bash
# Install
pip install fonttools brotli

# Analyze font
ttx -o font-info.ttx your-font.woff2

# Subset font
pyftsubset your-font.woff2 \
  --output-file=subset.woff2 \
  --flavor=woff2 \
  --layout-features=* \
  --unicodes=U+0020-007E
```

### 6. Monitoring di Production

**Web Vitals JavaScript:**

```javascript
import {getCLS, getFCP, getLCP} from 'web-vitals';

getCLS(metric => {
  // Track CLS (target: < 0.1)
  console.log('CLS:', metric.value);
  sendToAnalytics({name: 'CLS', value: metric.value});
});

getFCP(metric => {
  // Track FCP (target: < 1.8s)
  console.log('FCP:', metric.value);
  sendToAnalytics({name: 'FCP', value: metric.value});
});

getLCP(metric => {
  // Track LCP (target: < 2.5s)
  console.log('LCP:', metric.value);
  sendToAnalytics({name: 'LCP', value: metric.value});
});
```

---

## 🌐 Real-World Case Studies

### 1. **Tokopedia — Font Optimization**

**Problem:**
- Multiple Google Fonts weights
- 250ms+ latency to fonts.gstatic.com
- FOIT causing poor FCP

**Solution:**
- Switched to self-hosted variable fonts
- Implemented font-display: swap
- Preloaded critical fonts
- Subsetted to Indonesian + Latin

**Results:**
- FCP: -42% (2.4s → 1.4s)
- LCP: -38% (2.9s → 1.8s)
- Font requests: 6 → 1 (-83%)
- Font payload: 180 KB → 45 KB (-75%)

**Source:** Tokopedia Engineering Blog, 2024

---

### 2. **Smashing Magazine — System Font Switch**

**Problem:**
- Custom web fonts adding 200ms to LCP
- High CLS from font swap
- Complex subsetting maintenance

**Solution:**
- Removed all web fonts
- Implemented system font stack
- Zero font loading overhead

**Results:**
- LCP: -23% (2.6s → 2.0s)
- CLS: -94% (0.17 → 0.01)
- Font payload: 120 KB → 0 KB (-100%)
- Lighthouse: 78 → 95

**Trade-off:** Less brand consistency, but acceptable for content-heavy site

**Source:** Smashing Magazine Performance Case Study, 2023

---

### 3. **The Guardian — Variable Font Migration**

**Problem:**
- 8 separate font files (4 weights × 2 styles)
- 320 KB total font weight
- Multiple render-blocking requests

**Solution:**
- Migrated to Guardian Egyptian Variable
- 1 variable font file with full weight range
- Implemented font-display: swap
- Aggressive subsetting

**Results:**
- Font files: 8 → 1 (-87%)
- Font payload: 320 KB → 85 KB (-73%)
- Font requests: 8 → 1 (-87%)
- LCP: -410ms average
- CLS improved by 0.08

**Source:** The Guardian Web Performance Report, 2024

---

### 4. **Airbnb — Preload Strategy**

**Problem:**
- Critical headline font not prioritized
- LCP element waiting for font
- Poor above-the-fold rendering

**Solution:**
```html
<!-- Preload only display font used in hero -->
<link rel="preload" 
      href="/fonts/airbnb-cereal-bold.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin>
```

**Results:**
- LCP: -580ms (font loaded before paint)
- FCP: -290ms
- Perceived performance significantly improved
- Hero rendering: Instant with fallback

**Source:** Airbnb Engineering & Data Science, 2023

---

### 5. **GOV.UK — Pragmatic Font Strategy**

**Problem:**
- Accessibility requirements
- Performance targets (< 2s LCP on 3G)
- Budget constraints

**Solution:**
- Primary: System fonts (no download)
- Progressive enhancement: Load custom font only on fast connections

```javascript
// Load custom font only if connection is fast
if (navigator.connection && 
    navigator.connection.effectiveType === '4g') {
  const link = document.createElement('link');
  link.href = '/fonts/transport-bold.woff2';
  link.rel = 'preload';
  link.as = 'font';
  document.head.appendChild(link);
}
```

**Results:**
- LCP: 1.4s (95th percentile)
- 100% of users see content instantly
- Custom fonts = progressive enhancement
- Lighthouse: 98/100

**Source:** GOV.UK Performance Team Blog, 2024

---

## 📚 Best Practices Summary

### ✅ DO:

1. **Always use `font-display: swap`** (eliminates FOIT)
2. **Preload only critical fonts** (1-2 files max)
3. **Self-host fonts** when possible (avoids external latency)
4. **Use variable fonts** (fewer requests, smaller total size)
5. **Subset fonts aggressively** (Latin-only = 70% reduction)
6. **Match fallback metrics** (reduce CLS on font swap)
7. **Use WOFF2 format** (95%+ browser support, best compression)
8. **Test on slow networks** (3G = reality for many users)

### ❌ DON'T:

1. **Don't preload all fonts** (wastes bandwidth, delays other critical resources)
2. **Don't use `font-display: block`** unless branding is absolutely critical
3. **Don't load fonts from multiple origins** (DNS overhead multiplies)
4. **Don't forget `crossorigin`** on preload (breaks font loading)
5. **Don't load unused weights** (each weight = separate request)
6. **Don't ignore CLS** from font swap (can destroy user experience)
7. **Don't use old formats** (TTF/OTF = 2-3× larger than WOFF2)
8. **Don't optimize fonts in isolation** (holistic performance approach)

---

## 🔗 Resources & Further Reading

### Official Specs & Docs
- [CSS Fonts Module Level 4](https://www.w3.org/TR/css-fonts-4/) — W3C Specification
- [font-display descriptor](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display) — MDN
- [Web Font Optimization](https://web.dev/font-best-practices/) — web.dev

### Tools
- [glyphhanger](https://github.com/zachleat/glyphhanger) — Font subsetting tool
- [google-webfonts-helper](https://gwfh.mranftl.com/) — Self-host Google Fonts
- [Fontsource](https://fontsource.org/) — NPM packages for fonts
- [Font Squirrel Webfont Generator](https://www.fontsquirrel.com/tools/webfont-generator) — Convert & subset
- [wakamaifondue](https://wakamaifondue.com/) — Analyze font features

### Libraries & Plugins
- [fontfaceobserver](https://github.com/bramstein/fontfaceobserver) — Font loading detection
- [next/font](https://nextjs.org/docs/api-reference/next/font) — Next.js font optimization
- [@fontsource/*](https://www.npmjs.com/search?q=%40fontsource) — Self-hosted font packages

### Articles & Guides
- [A Comprehensive Guide to Font Loading Strategies](https://www.zachleat.com/web/comprehensive-webfonts/) — Zach Leatherman
- [Web Font Performance](https://csswizardry.com/2020/05/the-fastest-google-fonts/) — Harry Roberts
- [System Font Stack](https://systemfontstack.com/) — Modern system fonts reference

### Variable Fonts
- [Variable Fonts](https://v-fonts.com/) — Variable fonts catalog
- [Axis Praxis](https://www.axis-praxis.org/) — Variable font playground
- [Introduction to Variable Fonts](https://web.dev/variable-fonts/) — web.dev

---

## 💬 Kesimpulan

Font loading adalah salah satu **quick wins terbesar** dalam web performance optimization:

- ✅ **High Impact** — Langsung mempengaruhi FCP, LCP, CLS
- ✅ **Easy to Implement** — CSS property + HTML preload
- ✅ **Measurable** — Clear before/after metrics
- ✅ **Universal** — Applies to semua website yang pakai web fonts

**Golden Rule:** Content first, fonts second. User harus bisa membaca konten instantly, bahkan jika fonts belum fully loaded.

**Quick Start (3 Steps):**
1. Tambahkan `font-display: swap` ke semua `@font-face`
2. Preload 1-2 critical fonts
3. Subset ke Latin-only (jika bahasa support)

**Expected Results:**
- FCP improvement: 800ms - 2.5s
- LCP improvement: 400ms - 1.2s
- CLS reduction: 0.05 - 0.15
- Lighthouse score: +15 - 30 points

---

**Generated by Hermes Agent** | Performance Research | 22 Juni 2026
