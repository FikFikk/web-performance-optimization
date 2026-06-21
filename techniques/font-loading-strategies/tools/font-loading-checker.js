#!/usr/bin/env node

/**
 * Font Loading Performance Checker
 * 
 * Analyzes font loading strategy pada halaman web dan memberikan recommendations.
 * 
 * Usage:
 *   node font-loading-checker.js https://example.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function analyzeFontLoading(html) {
  const results = {
    preloads: [],
    fontFaces: [],
    fontDisplay: [],
    googleFonts: [],
    issues: [],
    recommendations: [],
    score: 100
  };
  
  // Check preload tags
  const preloadRegex = /<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*>/gi;
  const preloads = html.match(preloadRegex) || [];
  results.preloads = preloads;
  
  if (preloads.length === 0) {
    results.issues.push('❌ No font preload detected');
    results.recommendations.push('Add <link rel="preload"> for critical fonts');
    results.score -= 15;
  } else if (preloads.length > 2) {
    results.issues.push('⚠️  Too many font preloads (' + preloads.length + ')');
    results.recommendations.push('Preload only 1-2 critical fonts');
    results.score -= 10;
  } else {
    results.issues.push('✅ Optimal font preload count: ' + preloads.length);
  }
  
  // Check crossorigin attribute on preloads
  preloads.forEach((preload, i) => {
    if (!preload.includes('crossorigin')) {
      results.issues.push('❌ Preload #' + (i + 1) + ' missing crossorigin attribute');
      results.recommendations.push('Add crossorigin="anonymous" to font preloads');
      results.score -= 10;
    }
  });
  
  // Check for Google Fonts
  const googleFontsRegex = /fonts\.googleapis\.com|fonts\.gstatic\.com/gi;
  const googleFontsMatches = html.match(googleFontsRegex) || [];
  
  if (googleFontsMatches.length > 0) {
    results.googleFonts = googleFontsMatches;
    results.issues.push('⚠️  Using Google Fonts (external request)');
    results.recommendations.push('Consider self-hosting fonts for better performance');
    results.score -= 10;
    
    // Check for preconnect to Google Fonts
    if (!html.includes('preconnect') || !html.includes('fonts.gstatic.com')) {
      results.issues.push('❌ Missing preconnect to Google Fonts');
      results.recommendations.push('Add <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      results.score -= 5;
    }
    
    // Check for display=swap parameter
    if (!html.includes('display=swap')) {
      results.issues.push('❌ Google Fonts missing display=swap parameter');
      results.recommendations.push('Add &display=swap to Google Fonts URL');
      results.score -= 15;
    }
  }
  
  // Check @font-face declarations
  const fontFaceRegex = /@font-face\s*{[^}]+}/gi;
  const fontFaces = html.match(fontFaceRegex) || [];
  results.fontFaces = fontFaces;
  
  // Check font-display in @font-face
  fontFaces.forEach((fontFace, i) => {
    const displayMatch = fontFace.match(/font-display:\s*(\w+)/i);
    if (displayMatch) {
      const displayValue = displayMatch[1];
      results.fontDisplay.push(displayValue);
      
      if (displayValue === 'swap') {
        results.issues.push('✅ @font-face #' + (i + 1) + ' uses font-display: swap');
      } else if (displayValue === 'block') {
        results.issues.push('❌ @font-face #' + (i + 1) + ' uses font-display: block (FOIT risk)');
        results.recommendations.push('Change font-display to swap for better UX');
        results.score -= 20;
      } else {
        results.issues.push('⚠️  @font-face #' + (i + 1) + ' uses font-display: ' + displayValue);
      }
    } else {
      results.issues.push('❌ @font-face #' + (i + 1) + ' missing font-display property');
      results.recommendations.push('Add font-display: swap to all @font-face declarations');
      results.score -= 15;
    }
  });
  
  // Check for WOFF2 format
  const woff2Count = (html.match(/\.woff2/gi) || []).length;
  const woffCount = (html.match(/\.woff\b/gi) || []).length;
  const ttfCount = (html.match(/\.ttf/gi) || []).length;
  const otfCount = (html.match(/\.otf/gi) || []).length;
  
  if (woff2Count > 0) {
    results.issues.push('✅ Using WOFF2 format (optimal compression)');
  }
  
  if (ttfCount > 0 || otfCount > 0) {
    results.issues.push('❌ Using TTF/OTF format (outdated, large file size)');
    results.recommendations.push('Convert to WOFF2 format for 30-50% size reduction');
    results.score -= 15;
  }
  
  // Overall assessment
  if (results.score >= 90) {
    results.grade = 'A';
    results.assessment = '🎉 Excellent font loading strategy!';
  } else if (results.score >= 70) {
    results.grade = 'B';
    results.assessment = '👍 Good, but room for improvement';
  } else if (results.score >= 50) {
    results.grade = 'C';
    results.assessment = '⚠️  Needs optimization';
  } else {
    results.grade = 'F';
    results.assessment = '❌ Poor font loading performance';
  }
  
  return results;
}

function printResults(results) {
  console.log('\n=================================');
  console.log('  Font Loading Performance Report');
  console.log('=================================\n');
  
  console.log('Overall Score:', results.score, '/100');
  console.log('Grade:', results.grade);
  console.log(results.assessment);
  console.log('');
  
  console.log('📊 Summary:');
  console.log('- Font preloads:', results.preloads.length);
  console.log('- @font-face declarations:', results.fontFaces.length);
  console.log('- Google Fonts usage:', results.googleFonts.length > 0 ? 'Yes' : 'No');
  console.log('');
  
  if (results.issues.length > 0) {
    console.log('🔍 Issues Found:');
    results.issues.forEach(issue => console.log('  ' + issue));
    console.log('');
  }
  
  if (results.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log('  ' + (i + 1) + '. ' + rec);
    });
    console.log('');
  }
  
  console.log('=================================\n');
}

// Main
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: node font-loading-checker.js <url>');
    console.log('Example: node font-loading-checker.js https://example.com');
    process.exit(1);
  }
  
  console.log('Analyzing:', url);
  
  try {
    const html = await fetchHTML(url);
    const results = analyzeFontLoading(html);
    printResults(results);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFontLoading };
