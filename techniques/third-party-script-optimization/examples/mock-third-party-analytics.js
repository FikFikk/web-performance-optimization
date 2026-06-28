// mock-third-party-analytics.js
console.log('📊 Mock Analytics: Mulai inisialisasi...');
const startTime = performance.now();

// Menstimulasi blocking CPU intensif selama 150ms
while (performance.now() - startTime < 150) {
  // Blocking main thread
}

console.log(`📊 Mock Analytics: Selesai diinisialisasi dalam ${(performance.now() - startTime).toFixed(1)}ms`);

// Simulasikan pengiriman data analytics
window.mockAnalyticsData = {
  initialized: true,
  loadTime: performance.now(),
  sdkVersion: 'v4.2.0-mock'
};
