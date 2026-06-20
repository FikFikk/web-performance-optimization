// measure-bundle-size.js - Script untuk mengukur bundle size
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function getFileSize(filepath) {
  const stats = fs.statSync(filepath);
  return stats.size;
}

function getGzipSize(filepath) {
  const buffer = fs.readFileSync(filepath);
  const gzipped = zlib.gzipSync(buffer, { level: 9 });
  return gzipped.length;
}

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function measureBundles() {
  const distDir = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.log('❌ Dist folder not found. Run "npm run build" first.');
    return;
  }

  const files = fs.readdirSync(distDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filepath = path.join(distDir, file);
      return {
        name: file,
        size: getFileSize(filepath),
        gzip: getGzipSize(filepath)
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\n📊 Bundle Size Analysis\n');
  console.log('File Name'.padEnd(40) + 'Size'.padEnd(15) + 'Gzipped');
  console.log('─'.repeat(70));

  let totalSize = 0;
  let totalGzip = 0;

  files.forEach(file => {
    console.log(
      file.name.padEnd(40) + 
      formatBytes(file.size).padEnd(15) + 
      formatBytes(file.gzip)
    );
    totalSize += file.size;
    totalGzip += file.gzip;
  });

  console.log('─'.repeat(70));
  console.log(
    'TOTAL'.padEnd(40) + 
    formatBytes(totalSize).padEnd(15) + 
    formatBytes(totalGzip)
  );

  // Calculate initial load (main + vendors + runtime)
  const initialChunks = files.filter(f => 
    f.name.includes('main.') || 
    f.name.includes('vendors.') || 
    f.name.includes('runtime.') ||
    f.name.includes('react.')
  );

  const initialSize = initialChunks.reduce((sum, f) => sum + f.size, 0);
  const initialGzip = initialChunks.reduce((sum, f) => sum + f.gzip, 0);

  console.log('\n🚀 Initial Load Size');
  console.log('Raw:     ' + formatBytes(initialSize));
  console.log('Gzipped: ' + formatBytes(initialGzip));

  // Performance check
  if (initialGzip > 250000) {
    console.log('\n⚠️  WARNING: Initial bundle > 250 KB (gzipped)');
  } else {
    console.log('\n✅ Initial bundle size is within budget!');
  }

  console.log('\n');
}

measureBundles();
