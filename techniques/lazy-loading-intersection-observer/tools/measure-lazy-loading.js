const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Port server dummy
const PORT = 8089;

// Inisiasi Server HTTP lokal untuk men-serve asset before/after
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '../examples', req.url === '/' ? 'before.html' : req.url);
  if (req.url === '/after') {
    filePath = path.join(__dirname, '../examples/after.html');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Server performance checker berjalan di http://localhost:${PORT}`);
  
  try {
    const metricsBefore = await measurePage(`http://localhost:${PORT}/before.html`);
    console.log('\n--- METRIK SEBELUM OPTIMASI (BEFORE) ---');
    console.log(`Total Requests: ${metricsBefore.totalRequests}`);
    console.log(`Total Bytes Transferred (JS/Images/HTML): ${(metricsBefore.transferredBytes / 1024).toFixed(2)} KB`);
    console.log(`DOMContentLoaded Event: ${metricsBefore.domContentLoaded} ms`);
    console.log(`Load Event: ${metricsBefore.loadEvent} ms`);

    const metricsAfter = await measurePage(`http://localhost:${PORT}/after`);
    console.log('\n--- METRIK SETELAH OPTIMASI (AFTER) ---');
    console.log(`Total Requests: ${metricsAfter.totalRequests}`);
    console.log(`Total Bytes Transferred (JS/Images/HTML - Initial Load): ${(metricsAfter.transferredBytes / 1024).toFixed(2)} KB`);
    console.log(`DOMContentLoaded Event: ${metricsAfter.domContentLoaded} ms`);
    console.log(`Load Event: ${metricsAfter.loadEvent} ms`);

    // Bandingkan dan simpan ke file JSON
    const report = {
      before: metricsBefore,
      after: metricsAfter,
      savings: {
        requests: metricsBefore.totalRequests - metricsAfter.totalRequests,
        requestsPercent: ((metricsBefore.totalRequests - metricsAfter.totalRequests) / metricsBefore.totalRequests * 100).toFixed(1) + '%',
        bytes: ((metricsBefore.transferredBytes - metricsAfter.transferredBytes) / 1024).toFixed(2) + ' KB',
        bytesPercent: ((metricsBefore.transferredBytes - metricsAfter.transferredBytes) / metricsBefore.transferredBytes * 100).toFixed(1) + '%',
        loadTimeImprovement: (metricsBefore.loadEvent - metricsAfter.loadEvent).toFixed(2) + ' ms',
        loadTimeImprovementPercent: ((metricsBefore.loadEvent - metricsAfter.loadEvent) / metricsBefore.loadEvent * 100).toFixed(1) + '%'
      }
    };

    console.log('\n--- RINGKASAN EFISIENSI LAZY LOADING ---');
    console.log(`Reduksi Request: ${report.savings.requests} (${report.savings.requestsPercent})`);
    console.log(`Penghematan Data Awal: ${report.savings.bytes} (${report.savings.bytesPercent})`);
    console.log(`Percepatan Load Halaman: ${report.savings.loadTimeImprovement} (${report.savings.loadTimeImprovementPercent})`);

    fs.writeFileSync(path.join(__dirname, '../metrics-comparison.json'), JSON.stringify(report, null, 2));
    console.log('\nHasil pengujian berhasil ditulis ke metrics-comparison.json');

  } catch (error) {
    console.error('Pengujian gagal:', error);
  } finally {
    server.close(() => {
      console.log('Server performance checker dimatikan.');
      process.exit(0);
    });
  }
});

async function measurePage(url) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Catat request network dan ukuran byte transfer
  let totalRequests = 0;
  let transferredBytes = 0;

  page.on('request', () => {
    totalRequests++;
  });

  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      if (headers['content-length']) {
        transferredBytes += parseInt(headers['content-length'], 10);
      } else {
        const buffer = await response.buffer();
        transferredBytes += buffer.length;
      }
    } catch (e) {
      // Abaikan jika content/buffer tidak dapat dibaca
    }
  });

  // Buka halaman
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // Dapatkan timing metric
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  const domContentLoaded = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
  const loadEvent = performanceTiming.loadEventEnd - performanceTiming.navigationStart;

  await browser.close();

  return {
    totalRequests,
    transferredBytes,
    domContentLoaded,
    loadEvent
  };
}
