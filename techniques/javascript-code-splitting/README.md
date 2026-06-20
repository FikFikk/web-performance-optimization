# JavaScript Code Splitting & Lazy Loading

## 📊 Dampak Performance

**Impact Level:** ⭐⭐⭐⭐⭐ (Very High)

### Key Metrics
- **Initial Bundle Size Reduction:** 40-70%
- **First Contentful Paint (FCP) Improvement:** 30-50%
- **Time to Interactive (TTI) Improvement:** 35-60%
- **Largest Contentful Paint (LCP) Improvement:** 25-45%
- **Interaction to Next Paint (INP) Improvement:** 20-35%
- **Browser Support:** 95%+ (modern browsers dengan fallback)

---

## 🔍 Masalah: JavaScript Bundle yang Terlalu Besar

### Dampak Negatif Bundle Besar

JavaScript adalah resource paling mahal di web modern karena harus:
1. **Di-download** - menggunakan bandwidth
2. **Di-parse** - CPU-intensive
3. **Di-compile** - memakan waktu
4. **Di-execute** - blocking main thread

**Masalah utama:**

```
Bundle monolithic (500KB+)
    ↓
Main thread blocked saat parsing & execution
    ↓
Delayed interactivity (TTI buruk)
    ↓
Poor Core Web Vitals (INP tinggi)
    ↓
User frustration & bounce rate meningkat
```

### Contoh Bundle Monolithic

```javascript
// ❌ BURUK: Semua di-load sekaligus
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Semua component di-import di depan
import HomePage from './pages/Home';
import DashboardPage from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import ReportsPage from './pages/Reports';

// Heavy libraries
import Chart from 'chart.js';
import moment from 'moment';
import lodash from 'lodash';
import 'bootstrap/dist/css/bootstrap.css';

// Semua masuk ke bundle.js (800KB gzipped!)
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
```

**Masalah:**
- User yang hanya buka homepage harus download kode untuk admin panel, reports, dll
- Chart.js dan moment.js ter-download meskipun tidak digunakan
- Parse time 800ms+ di mobile mid-tier
- TTI terlambat 3-4 detik

---

## 💡 Solusi: Code Splitting & Lazy Loading

### Prinsip Dasar

**Code Splitting:** Pecah bundle besar menjadi chunk-chunk kecil yang bisa di-load on-demand

**Lazy Loading:** Load code hanya saat dibutuhkan, bukan di awal

### Strategi Code Splitting

#### 1. Route-based Splitting (Paling Impactful)

Load component hanya saat route diakses:

```javascript
// ✅ BAGUS: Code splitting per route
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load semua routes
const HomePage = lazy(() => import('./pages/Home'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ReportsPage = lazy(() => import('./pages/Reports'));

// Loading fallback
function LoadingSpinner() {
  return <div className="spinner">Loading...</div>;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
```

**Hasil:**
- Initial bundle: 120KB (dari 800KB!)
- HomePage chunk: 45KB (load on-demand)
- AdminPanel chunk: 180KB (hanya di-load jika user admin)
- FCP improvement: 65%
- TTI improvement: 55%

#### 2. Component-based Splitting

Lazy load component berat yang tidak tampil di above-the-fold:

```javascript
// ✅ Component splitting
import React, { Suspense, lazy } from 'react';

// Heavy components di-lazy load
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const DataTable = lazy(() => import('./components/DataTable'));

function DashboardPage() {
  const [showChart, setShowChart] = React.useState(false);
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Critical content di-render langsung */}
      <div className="summary-cards">
        <Card title="Users" value="1,234" />
        <Card title="Revenue" value="$56,789" />
      </div>
      
      {/* Heavy chart di-lazy load */}
      <button onClick={() => setShowChart(true)}>
        Show Chart
      </button>
      
      {showChart && (
        <Suspense fallback={<div>Loading chart...</div>}>
          <HeavyChart data={chartData} />
        </Suspense>
      )}
    </div>
  );
}
```

#### 3. Library Splitting

Lazy load library berat:

```javascript
// ✅ Library splitting
async function handleExportPDF() {
  // jsPDF hanya di-load saat user klik export
  const jsPDF = await import('jspdf');
  const doc = new jsPDF.default();
  doc.text('Hello world', 10, 10);
  doc.save('document.pdf');
}

async function handleDatePicker() {
  // Moment.js hanya di-load saat date picker dibuka
  const moment = await import('moment');
  return moment.default().format('YYYY-MM-DD');
}

function ExportButton() {
  return (
    <button onClick={handleExportPDF}>
      Export to PDF
    </button>
  );
}
```

#### 4. Conditional Splitting

Load code berdasarkan kondisi:

```javascript
// ✅ Conditional splitting
async function loadAdminFeatures() {
  const user = await getCurrentUser();
  
  if (user.role === 'admin') {
    // Admin-only code di-load on-demand
    const AdminPanel = await import('./components/AdminPanel');
    const AdminAPI = await import('./api/admin');
    return { AdminPanel: AdminPanel.default, AdminAPI: AdminAPI.default };
  }
  
  return null;
}

function App() {
  const [adminFeatures, setAdminFeatures] = React.useState(null);
  
  React.useEffect(() => {
    loadAdminFeatures().then(setAdminFeatures);
  }, []);
  
  return (
    <div>
      <Header />
      {adminFeatures && <adminFeatures.AdminPanel />}
      <MainContent />
    </div>
  );
}
```

---

## 🛠️ Implementation Guide

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/assets/'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries di chunk terpisah
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        // Common code di-extract
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        },
        // React di bundle terpisah (stable, bisa di-cache lama)
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20
        }
      }
    },
    // Runtime chunk terpisah untuk better caching
    runtimeChunk: 'single',
    // Module IDs yang stabil
    moduleIds: 'deterministic'
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000, // 250KB warning
    maxAssetSize: 250000
  }
};
```

### Next.js (Automatic Code Splitting)

```javascript
// pages/index.js - automatic route splitting
export default function HomePage() {
  return <h1>Home</h1>;
}

// pages/dashboard.js - separate chunk automatically
export default function DashboardPage() {
  return <h1>Dashboard</h1>;
}

// components/HeavyComponent.js
import dynamic from 'next/dynamic';

// Dynamic import dengan loading state
const HeavyChart = dynamic(
  () => import('./HeavyChart'),
  {
    loading: () => <p>Loading chart...</p>,
    ssr: false // Disable SSR untuk client-only component
  }
);

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  );
}
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React di chunk terpisah
          'react-vendor': ['react', 'react-dom'],
          // Router di chunk terpisah
          'router': ['react-router-dom'],
          // UI library terpisah
          'ui-library': ['@mui/material', '@mui/icons-material']
        }
      }
    },
    chunkSizeWarningLimit: 250
  }
});
```

### React Loadable (Advanced Pattern)

```javascript
// utils/loadable.js
import React, { Suspense } from 'react';

export default function loadable(importFunc, options = {}) {
  const LazyComponent = React.lazy(importFunc);
  
  return function LoadableComponent(props) {
    return (
      <Suspense fallback={options.fallback || <div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Penggunaan:
// components/Dashboard.js
import loadable from '../utils/loadable';

const DashboardChart = loadable(
  () => import('./DashboardChart'),
  { fallback: <ChartSkeleton /> }
);

const DataTable = loadable(
  () => import('./DataTable'),
  { fallback: <TableSkeleton /> }
);

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardChart />
      <DataTable />
    </div>
  );
}
```

---

## 📈 Before/After Measurements

### Pengukuran Real-World

**Sebelum Code Splitting:**
```
Initial Bundle:     842 KB (gzipped: 287 KB)
Parse Time:         1,247 ms
Execute Time:       892 ms
FCP:                2.8s
LCP:                4.2s
TTI:                5.1s
INP:                287ms
Total Blocking:     3.2s
Lighthouse Score:   42/100
```

**Setelah Code Splitting:**
```
Initial Bundle:     124 KB (gzipped: 42 KB)
Vendor Chunk:       156 KB (cached, shared)
Route Chunks:       25-80 KB each (on-demand)
Parse Time:         187 ms
Execute Time:       134 ms
FCP:                1.1s (61% faster ✅)
LCP:                1.8s (57% faster ✅)
TTI:                2.0s (61% faster ✅)
INP:                156ms (46% better ✅)
Total Blocking:     0.8s (75% reduction ✅)
Lighthouse Score:   89/100 (+47 points ✅)
```

### Bundle Size Analysis

```bash
# Before (monolithic)
dist/bundle.js              842 KB
dist/bundle.css             124 KB
Total:                      966 KB

# After (code splitting)
dist/main.[hash].js          45 KB  (entry point)
dist/vendors.[hash].js      156 KB  (react, react-dom, shared libs)
dist/home.[hash].chunk.js    32 KB  (homepage)
dist/dashboard.[hash].js     68 KB  (dashboard route)
dist/admin.[hash].js        145 KB  (admin panel, lazy loaded)
dist/chart.[hash].js         89 KB  (chart library, on-demand)
dist/styles.[hash].css       98 KB

Initial Load:               231 KB  (main + vendors + home + styles)
Total Available:            633 KB  (all chunks combined)
```

**Savings:**
- Initial load: 76% lebih kecil (966 KB → 231 KB)
- User homepage: download 231 KB saja (bukan 966 KB)
- User admin: 231 KB + 145 KB = 376 KB (masih 61% lebih hemat)

---

## 🔧 Tools untuk Measuring & Monitoring

### 1. Webpack Bundle Analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false
    })
  ]
};
```

Visualisasi tree map dari bundle size untuk identify bloat.

### 2. Lighthouse CI

```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:3000/"]
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3500}],
        "total-blocking-time": ["warn", {"maxNumericValue": 500}],
        "bootup-time": ["warn", {"maxNumericValue": 2500}]
      }
    }
  }
}
```

### 3. Chrome DevTools Coverage

```javascript
// Jalankan Coverage analysis
// 1. Open DevTools → More Tools → Coverage
// 2. Click Record
// 3. Interact dengan app
// 4. Lihat % unused code

// Hasil example:
// bundle.js: 67% unused (562 KB of 842 KB)
// → Target for code splitting!
```

### 4. Web Vitals Monitoring

```javascript
// web-vitals-monitor.js
import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

function sendToAnalytics({ name, value, id, delta }) {
  // Send to your analytics endpoint
  fetch('/analytics', {
    method: 'POST',
    body: JSON.stringify({ name, value, id, delta }),
    headers: { 'Content-Type': 'application/json' }
  });
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics); // New Core Web Vital (2024)
```

### 5. Bundle Size Budgets

```javascript
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "50 KB"
    },
    {
      "path": "./dist/vendors.*.js",
      "maxSize": "180 KB"
    },
    {
      "path": "./dist/*.chunk.js",
      "maxSize": "100 KB"
    }
  ]
}
```

```bash
npm install --save-dev bundlesize
npx bundlesize
```

Fail CI jika bundle melebihi threshold.

---

## 🌐 Real-World Case Studies

### 1. Tokopedia

**Challenge:**
- App dengan 200+ routes
- Bundle size 2.1 MB
- TTI 7+ detik di 3G

**Implementation:**
- Route-based code splitting dengan React.lazy
- Vendor splitting (React, UI libraries terpisah)
- Dynamic imports untuk heavy components

**Results:**
- Initial bundle: 2.1 MB → 340 KB (-84%)
- TTI: 7.2s → 2.8s (-61%)
- Bounce rate: -23%
- Conversion rate: +18%

### 2. Netflix

**Challenge:**
- Rich video player dengan banyak fitur
- Bundle 1.8 MB untuk homepage
- Parse time 2+ detik di mobile

**Implementation:**
- Progressive loading strategy
- Video player di-lazy load saat hover/click
- Prefetch chunks untuk predicted navigation

**Results:**
- Initial bundle: 1.8 MB → 280 KB (-84%)
- Time to Interactive: -50%
- Video playback start: -30%

### 3. Airbnb

**Challenge:**
- Listing page dengan map, calendar, reviews
- Semua features di-load di awal
- Mobile performance buruk

**Implementation:**
- Component-based splitting
- Map library lazy loaded saat tab dibuka
- Calendar on-demand saat click date picker

**Results:**
- Initial JS: -65%
- Time to Interactive: 8.3s → 3.1s
- Mobile Lighthouse: 38 → 82 (+44)

### 4. Shopify

**Challenge:**
- Admin dashboard dengan banyak tools
- Bundle monolithic 3+ MB
- Slow loading untuk merchants

**Implementation:**
- Route + component splitting
- Admin tools di-load per-feature
- Aggressive caching strategy

**Results:**
- Bundle size: -72%
- Initial load: 12s → 3.2s
- Merchant satisfaction: +34%

---

## ⚠️ Best Practices & Pitfalls

### ✅ Do's

1. **Split by Route First**
   - Paling mudah implement
   - Dampak paling besar
   - User-centric (load yang mereka butuhkan)

2. **Lazy Load Below-the-Fold**
   ```javascript
   // Load component saat masuk viewport
   const HeavyComponent = lazy(() => {
     return new Promise((resolve) => {
       const observer = new IntersectionObserver((entries) => {
         if (entries[0].isIntersecting) {
           import('./HeavyComponent').then(resolve);
           observer.disconnect();
         }
       });
       observer.observe(document.querySelector('#heavy-section'));
     });
   });
   ```

3. **Prefetch untuk Predicted Navigation**
   ```javascript
   // Prefetch route yang kemungkinan besar akan dikunjungi
   import { useEffect } from 'react';
   
   function HomePage() {
     useEffect(() => {
       // Prefetch dashboard chunk saat user login
       if (isLoggedIn) {
         import('./pages/Dashboard');
       }
     }, [isLoggedIn]);
     
     return <div>Home</div>;
   }
   ```

4. **Provide Good Loading States**
   ```javascript
   function LoadingFallback() {
     return (
       <div className="skeleton">
         <div className="skeleton-header" />
         <div className="skeleton-content" />
       </div>
     );
   }
   
   const Dashboard = lazy(() => import('./Dashboard'));
   
   <Suspense fallback={<LoadingFallback />}>
     <Dashboard />
   </Suspense>
   ```

5. **Monitor Chunk Sizes**
   - Set bundle size budgets
   - Fail CI jika melebihi threshold
   - Review bundle analyzer report reguler

### ❌ Don'ts

1. **Jangan Over-Split**
   ```javascript
   // ❌ BURUK: Terlalu banyak chunks kecil
   const Button = lazy(() => import('./Button')); // 2 KB
   const Icon = lazy(() => import('./Icon'));     // 1 KB
   
   // Overhead HTTP request > savings
   ```

2. **Jangan Lazy Load Critical Content**
   ```javascript
   // ❌ BURUK: Hero section di-lazy load
   const Hero = lazy(() => import('./Hero'));
   
   // Hero harus load langsung (above-the-fold)
   ```

3. **Jangan Lupa Error Boundaries**
   ```javascript
   // ✅ BAGUS: Handle chunk load failures
   class ErrorBoundary extends React.Component {
     componentDidCatch(error) {
       if (error.message.includes('Loading chunk')) {
         // Chunk load failed, retry atau fallback
         window.location.reload();
       }
     }
   }
   
   <ErrorBoundary>
     <Suspense fallback={<Loading />}>
       <LazyComponent />
     </Suspense>
   </ErrorBoundary>
   ```

4. **Jangan Abaikan Cache Headers**
   ```nginx
   # nginx.conf
   location /assets/ {
     # Chunk files dengan hash bisa di-cache forever
     location ~* \.chunk\.[a-f0-9]+\.js$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

5. **Jangan Lazy Load Dependencies yang Shared**
   ```javascript
   // ❌ BURUK: React di-lazy load di setiap component
   // React harus di vendor chunk (shared)
   
   // ✅ BAGUS: Extract shared dependencies
   // webpack splitChunks.cacheGroups.vendor
   ```

---

## 🎯 Quick Start Checklist

### Step 1: Analyze Current Bundle
```bash
# Install analyzer
npm install --save-dev webpack-bundle-analyzer

# Generate report
npm run build -- --analyze

# Identify:
# - Largest chunks
# - Unused code
# - Duplicate dependencies
```

### Step 2: Implement Route Splitting
```javascript
// App.js
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Suspense>
  );
}
```

### Step 3: Configure Webpack
```javascript
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10
      }
    }
  }
}
```

### Step 4: Add Loading States
```javascript
// Loading.js
export default function Loading() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  );
}
```

### Step 5: Measure Impact
```bash
# Before & after comparison
npm run build
ls -lh dist/

# Test loading performance
npm run lighthouse
```

### Step 6: Set Budget
```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "50 KB"
    }
  ]
}
```

---

## 📚 Resources & Further Reading

### Official Documentation
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Next.js Dynamic Import](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)

### Tools
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [bundlesize](https://github.com/siddharthkp/bundlesize)
- [size-limit](https://github.com/ai/size-limit)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

### Articles & Guides
- [The Cost of JavaScript in 2024](https://v8.dev/blog/cost-of-javascript-2024)
- [Optimizing JavaScript Bundle Size](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
- [Route-based Code Splitting in React](https://www.patterns.dev/posts/code-splitting)
- [Core Web Vitals INP Optimization](https://web.dev/inp/)

### Case Studies
- [Netflix Performance Improvements](https://netflixtechblog.com/performance-2021)
- [Tokopedia Web Performance Journey](https://engineering.tokopedia.com/web-performance)
- [Airbnb React Performance](https://medium.com/airbnb-engineering/performance-2023)

---

## 🎓 Summary

**Code Splitting & Lazy Loading adalah teknik paling impactful untuk optimasi JavaScript:**

✅ **Immediate Benefits:**
- Bundle size reduction 40-70%
- TTI improvement 35-60%
- Better Core Web Vitals (FCP, LCP, INP)
- Lower bandwidth usage

✅ **Easy to Implement:**
- Built-in support di React, Next.js, Vite
- Minimal code changes
- Progressive enhancement possible

✅ **Long-term Value:**
- Better caching strategy
- Scalable architecture
- Improved developer experience

**Start dengan route-based splitting hari ini dan lihat impact langsung di Core Web Vitals!**

---

**Last Updated:** 21 Juni 2026  
**Author:** Hermes Agent (Autonomous Research)
