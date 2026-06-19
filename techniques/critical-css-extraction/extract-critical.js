/**
 * Extract Critical CSS - Single Page
 * 
 * Usage: node extract-critical.js <url> [output-file]
 * Example: node extract-critical.js https://example.com critical.css
 */

const critical = require('critical');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const targetUrl = args[0] || 'https://example.com';
const outputFile = args[1] || 'critical.css';

console.log(`🔍 Extracting critical CSS from: ${targetUrl}`);
console.log(`📝 Output file: ${outputFile}\n`);

// Configuration
const config = {
  // Target URL or local HTML file
  src: targetUrl,
  
  // Output
  target: {
    css: outputFile,
    html: outputFile.replace('.css', '.html'),
    uncritical: outputFile.replace('.css', '-remaining.css')
  },
  
  // Viewport dimensions (mobile, tablet, desktop)
  dimensions: [
    {
      width: 390,
      height: 844
    },
    {
      width: 768,
      height: 1024
    },
    {
      width: 1920,
      height: 1080
    }
  ],
  
  // Options
  inline: true,           // Inline critical CSS in HTML
  minify: true,           // Minify output
  extract: true,          // Extract remaining CSS to separate file
  
  // Ignore certain rules
  ignore: {
    atrule: ['@font-face'],  // Handle fonts separately
    rule: [/\.debug/],        // Ignore debug classes
    decl: (node, value) => {
      // Ignore print-only styles
      return /print/.test(value);
    }
  },
  
  // Performance
  penthouse: {
    timeout: 30000,
    renderWaitTime: 500,
    blockJSRequests: false
  }
};

// Execute extraction
critical.generate(config)
  .then(({ html, css, uncritical }) => {
    console.log('✅ Critical CSS extracted successfully!\n');
    
    // Write outputs
    if (css) {
      fs.writeFileSync(outputFile, css);
      console.log(`📄 Critical CSS: ${outputFile} (${(css.length / 1024).toFixed(2)} KB)`);
    }
    
    if (html) {
      const htmlFile = outputFile.replace('.css', '.html');
      fs.writeFileSync(htmlFile, html);
      console.log(`📄 HTML with inline critical CSS: ${htmlFile}`);
    }
    
    if (uncritical) {
      const uncriticalFile = outputFile.replace('.css', '-remaining.css');
      fs.writeFileSync(uncriticalFile, uncritical);
      console.log(`📄 Remaining CSS: ${uncriticalFile} (${(uncritical.length / 1024).toFixed(2)} KB)`);
    }
    
    // Stats
    const criticalSize = css ? css.length : 0;
    const totalSize = criticalSize + (uncritical ? uncritical.length : 0);
    const criticalPercent = totalSize > 0 ? ((criticalSize / totalSize) * 100).toFixed(1) : 0;
    
    console.log('\n📊 Statistics:');
    console.log(`   Critical CSS: ${criticalPercent}% of total CSS`);
    console.log(`   Total CSS size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Reduction for initial load: ${(100 - parseFloat(criticalPercent)).toFixed(1)}%`);
    
    // Recommendations
    console.log('\n💡 Next Steps:');
    console.log('   1. Review critical.css to ensure all above-the-fold styles are included');
    console.log('   2. Test on real devices to check for FOUC');
    console.log('   3. Integrate into your build process');
    console.log('   4. Load remaining CSS asynchronously:');
    console.log('      <link rel="preload" href="remaining.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">');
  })
  .catch(err => {
    console.error('❌ Error extracting critical CSS:');
    console.error(err.message);
    process.exit(1);
  });
