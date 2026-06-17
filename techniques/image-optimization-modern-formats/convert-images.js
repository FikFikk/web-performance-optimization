#!/usr/bin/env node

/**
 * Batch Image Converter - JPEG/PNG ke WebP & AVIF
 * 
 * Usage:
 *   npm install sharp
 *   node convert-images.js [input-directory]
 * 
 * Features:
 * - Parallel processing untuk speed
 * - Progress tracking
 * - Error handling
 * - Size comparison report
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const CONFIG = {
  inputDir: process.argv[2] || './images',
  webpQuality: 85,
  avifQuality: 80,
  concurrency: 4, // Parallel conversions
};

// Stats tracking
const stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  originalSize: 0,
  webpSize: 0,
  avifSize: 0,
};

/**
 * Get file size in bytes
 */
async function getFileSize(filePath) {
  try {
    const fileStats = await stat(filePath);
    return fileStats.size;
  } catch {
    return 0;
  }
}

/**
 * Convert single image to WebP and AVIF
 */
async function convertImage(inputPath) {
  const parsed = path.parse(inputPath);
  const outputDir = parsed.dir;
  const baseName = parsed.name;
  
  const webpPath = path.join(outputDir, `${baseName}.webp`);
  const avifPath = path.join(outputDir, `${baseName}.avif`);
  
  try {
    // Get original size
    const originalSize = await getFileSize(inputPath);
    stats.originalSize += originalSize;
    
    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: CONFIG.webpQuality })
      .toFile(webpPath);
    
    const webpSize = await getFileSize(webpPath);
    stats.webpSize += webpSize;
    
    // Convert to AVIF
    await sharp(inputPath)
      .avif({ quality: CONFIG.avifQuality, speed: 6 })
      .toFile(avifPath);
    
    const avifSize = await getFileSize(avifPath);
    stats.avifSize += avifSize;
    
    stats.processed++;
    
    const webpReduction = ((1 - webpSize / originalSize) * 100).toFixed(1);
    const avifReduction = ((1 - avifSize / originalSize) * 100).toFixed(1);
    
    console.log(`✓ ${path.basename(inputPath)}`);
    console.log(`  Original: ${formatBytes(originalSize)}`);
    console.log(`  WebP: ${formatBytes(webpSize)} (-${webpReduction}%)`);
    console.log(`  AVIF: ${formatBytes(avifSize)} (-${avifReduction}%)`);
    
  } catch (err) {
    stats.errors++;
    console.error(`✗ Error converting ${inputPath}:`, err.message);
  }
}

/**
 * Find all JPEG/PNG files recursively
 */
async function findImages(dir) {
  const images = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursive
        const subImages = await findImages(fullPath);
        images.push(...subImages);
      } else if (entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name)) {
        // Skip jika WebP/AVIF sudah ada
        const parsed = path.parse(fullPath);
        const webpExists = fs.existsSync(path.join(parsed.dir, `${parsed.name}.webp`));
        const avifExists = fs.existsSync(path.join(parsed.dir, `${parsed.name}.avif`));
        
        if (webpExists && avifExists) {
          stats.skipped++;
          console.log(`⊘ Skipped ${entry.name} (already converted)`);
        } else {
          images.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return images;
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Process images in batches for parallel processing
 */
async function processInBatches(images, batchSize) {
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    await Promise.all(batch.map(img => convertImage(img)));
    
    const progress = Math.min(i + batchSize, images.length);
    console.log(`\nProgress: ${progress}/${images.length}\n`);
  }
}

/**
 * Print summary report
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('CONVERSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');
  console.log(`Original total size: ${formatBytes(stats.originalSize)}`);
  console.log(`WebP total size: ${formatBytes(stats.webpSize)}`);
  console.log(`AVIF total size: ${formatBytes(stats.avifSize)}`);
  console.log('');
  
  if (stats.originalSize > 0) {
    const webpSavings = ((1 - stats.webpSize / stats.originalSize) * 100).toFixed(1);
    const avifSavings = ((1 - stats.avifSize / stats.originalSize) * 100).toFixed(1);
    
    console.log(`WebP savings: ${webpSavings}% (${formatBytes(stats.originalSize - stats.webpSize)})`);
    console.log(`AVIF savings: ${avifSavings}% (${formatBytes(stats.originalSize - stats.avifSize)})`);
  }
  
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  console.log('🖼️  Image Converter: WebP & AVIF');
  console.log(`Input directory: ${CONFIG.inputDir}\n`);
  
  // Check if input directory exists
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`Error: Directory ${CONFIG.inputDir} does not exist`);
    process.exit(1);
  }
  
  // Check if Sharp is installed
  try {
    require.resolve('sharp');
  } catch {
    console.error('Error: Sharp is not installed');
    console.error('Run: npm install sharp');
    process.exit(1);
  }
  
  // Find all images
  console.log('Scanning for images...\n');
  const images = await findImages(CONFIG.inputDir);
  
  if (images.length === 0) {
    console.log('No new images to convert.');
    process.exit(0);
  }
  
  console.log(`Found ${images.length} images to convert.\n`);
  
  // Process images
  const startTime = Date.now();
  await processInBatches(images, CONFIG.concurrency);
  const endTime = Date.now();
  
  // Print summary
  printSummary();
  console.log(`\nCompleted in ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
