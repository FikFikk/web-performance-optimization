/**
 * Compare Lighthouse Metrics - Before/After Analysis
 * 
 * Usage: node compare-metrics.js before.json after.json
 */

const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Usage: node compare-metrics.js <before.json> <after.json>');
    process.exit(1);
  }
  
  return {
    before: args[0],
    after: args[1]
  };
}

function loadLighthouseReport(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Error loading ${filepath}:`, err.message);
    process.exit(1);
  }
}

function getMetrics(report) {
  const audits = report.audits || {};
  
  return {
    fcp: audits['first-contentful-paint']?.numericValue || 0,
    lcp: audits['largest-contentful-paint']?.numericValue || 0,
    tti: audits['interactive']?.numericValue || 0,
    tbt: audits['total-blocking-time']?.numericValue || 0,
    cls: audits['cumulative-layout-shift']?.numericValue || 0,
    speedIndex: audits['speed-index']?.numericValue || 0,
    performanceScore: (report.categories?.performance?.score || 0) * 100
  };
}

function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function calculateImprovement(before, after) {
  if (before === 0) return 0;
  return ((before - after) / before) * 100;
}

function getImprovementEmoji(improvement) {
  if (improvement >= 30) return '🚀';
  if (improvement >= 15) return '✅';
  if (improvement >= 5) return '👍';
  if (improvement >= -5) return '→';
  return '⚠️';
}

function compareMetrics(before, after) {
  const metrics = [
    { key: 'fcp', name: 'First Contentful Paint', unit: 'ms' },
    { key: 'lcp', name: 'Largest Contentful Paint', unit: 'ms' },
    { key: 'tti', name: 'Time to Interactive', unit: 'ms' },
    { key: 'tbt', name: 'Total Blocking Time', unit: 'ms' },
    { key: 'cls', name: 'Cumulative Layout Shift', unit: '' },
    { key: 'speedIndex', name: 'Speed Index', unit: 'ms' },
    { key: 'performanceScore', name: 'Performance Score', unit: '' }
  ];
  
  console.log('\n📊 Performance Comparison\n');
  console.log('─'.repeat(80));
  console.log('Metric'.padEnd(30) + 'Before'.padEnd(15) + 'After'.padEnd(15) + 'Change');
  console.log('─'.repeat(80));
  
  metrics.forEach(metric => {
    const beforeVal = before[metric.key];
    const afterVal = after[metric.key];
    const improvement = calculateImprovement(beforeVal, afterVal);
    const emoji = getImprovementEmoji(improvement);
    
    let beforeStr, afterStr;
    if (metric.key === 'cls') {
      beforeStr = beforeVal.toFixed(3);
      afterStr = afterVal.toFixed(3);
    } else if (metric.key === 'performanceScore') {
      beforeStr = beforeVal.toFixed(0);
      afterStr = afterVal.toFixed(0);
    } else {
      beforeStr = formatMs(beforeVal);
      afterStr = formatMs(afterVal);
    }
    
    const changeStr = improvement >= 0 
      ? `↓ ${improvement.toFixed(1)}%`
      : `↑ ${Math.abs(improvement).toFixed(1)}%`;
    
    console.log(
      metric.name.padEnd(30) +
      beforeStr.padEnd(15) +
      afterStr.padEnd(15) +
      `${emoji} ${changeStr}`
    );
  });
  
  console.log('─'.repeat(80));
  
  // Summary
  const avgImprovement = metrics
    .filter(m => m.key !== 'cls' && m.key !== 'performanceScore')
    .reduce((sum, m) => sum + calculateImprovement(before[m.key], after[m.key]), 0) / 5;
  
  console.log(`\n💡 Average Improvement: ${avgImprovement.toFixed(1)}%`);
  
  // Core Web Vitals assessment
  console.log('\n🎯 Core Web Vitals Assessment:\n');
  
  const assessCWV = (metric, value, thresholds) => {
    if (value <= thresholds.good) return '✅ Good';
    if (value <= thresholds.needsImprovement) return '⚠️  Needs Improvement';
    return '❌ Poor';
  };
  
  console.log(`   LCP: ${formatMs(after.lcp)} ${assessCWV(after.lcp, after.lcp, { good: 2500, needsImprovement: 4000 })}`);
  console.log(`   FCP: ${formatMs(after.fcp)} ${assessCWV(after.fcp, after.fcp, { good: 1800, needsImprovement: 3000 })}`);
  console.log(`   CLS: ${after.cls.toFixed(3)} ${assessCWV(after.cls, after.cls, { good: 0.1, needsImprovement: 0.25 })}`);
  console.log(`   TBT: ${formatMs(after.tbt)} ${assessCWV(after.tbt, after.tbt, { good: 200, needsImprovement: 600 })}`);
  
  // Recommendations
  if (avgImprovement < 10) {
    console.log('\n💭 Recommendations:');
    console.log('   - Verify critical CSS is properly extracted');
    console.log('   - Check that full CSS is loaded asynchronously');
    console.log('   - Test on slower network conditions (3G)');
    console.log('   - Consider combining with image optimization');
  }
}

// Main
const { before, after } = parseArgs();

console.log(`📂 Loading reports...\n`);
console.log(`   Before: ${before}`);
console.log(`   After: ${after}`);

const beforeReport = loadLighthouseReport(before);
const afterReport = loadLighthouseReport(after);

const beforeMetrics = getMetrics(beforeReport);
const afterMetrics = getMetrics(afterReport);

compareMetrics(beforeMetrics, afterMetrics);

console.log('\n✨ Done!\n');
