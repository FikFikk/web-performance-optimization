/**
 * Extract Critical CSS - Multiple Pages
 * 
 * Generate different critical CSS for different page types
 * Usage: node extract-critical-multi.js
 */

const critical = require('critical');
const fs = require('fs');
const path = require('path');

// Define page types and their URLs
const pages = [
  {
    name: 'home',
    url: 'https://example.com',
    output: 'critical-home.css'
  },
  {
    name: 'product',
    url: 'https://example.com/product/sample',
    output: 'critical-product.css'
  },
  {
    name: 'article',
    url: 'https://example.com/blog/sample-post',
    output: 'critical-article.css'
  },
  {
    name: 'checkout',
    url: 'https://example.com/checkout',
    output: 'critical-checkout.css'
  }
];

// Shared configuration
const baseConfig = {
  dimensions: [
    { width: 390, height: 844 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1920, height: 1080 }  // Desktop
  ],
  inline: false,  // Don't inline, just extract
  minify: true,
  extract: true,
  ignore: {
    atrule: ['@font-face']
  },
  penthouse: {
    timeout: 30000,
    renderWaitTime: 500
  }
};

console.log('🚀 Starting multi-page critical CSS extraction...\n');

// Process pages sequentially
async function extractAll() {
  const results = [];
  
  for (const page of pages) {
    console.log(`🔍 Processing: ${page.name} (${page.url})`);
    
    try {
      const result = await critical.generate({
        ...baseConfig,
        src: page.url,
        target: {
          css: path.join('output', page.output)
        }
      });
      
      const size = result.css ? result.css.length : 0;
      console.log(`   ✅ Generated: ${page.output} (${(size / 1024).toFixed(2)} KB)`);
      
      results.push({
        page: page.name,
        url: page.url,
        output: page.output,
        size: size,
        success: true
      });
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      results.push({
        page: page.name,
        url: page.url,
        output: page.output,
        error: err.message,
        success: false
      });
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Summary:\n');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`   Total pages: ${results.length}`);
  console.log(`   Successful: ${successful.length}`);
  console.log(`   Failed: ${failed.length}\n`);
  
  if (successful.length > 0) {
    console.log('   Generated files:');
    successful.forEach(r => {
      console.log(`   - ${r.output} (${(r.size / 1024).toFixed(2)} KB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n   ⚠️  Failed pages:');
    failed.forEach(r => {
      console.log(`   - ${r.page}: ${r.error}`);
    });
  }
  
  // Save results
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'extraction-report.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n💾 Full report saved to: output/extraction-report.json');
}

// Run
extractAll().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
