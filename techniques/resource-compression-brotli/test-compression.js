#!/usr/bin/env node

// Script untuk test compression ratio dan verify deployment
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { URL } = require('url');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

async function checkCompression(url, encoding = 'br, gzip, deflate') {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Accept-Encoding': encoding,
                'User-Agent': 'CompressionTest/1.0',
            },
        };
        
        const req = protocol.request(options, (res) => {
            const chunks = [];
            
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentEncoding = res.headers['content-encoding'] || 'none';
                const varyHeader = res.headers['vary'] || 'none';
                const compressed = buffer.length;
                
                let original = compressed;
                try {
                    if (contentEncoding === 'br') {
                        original = zlib.brotliDecompressSync(buffer).length;
                    } else if (contentEncoding === 'gzip') {
                        original = zlib.gunzipSync(buffer).length;
                    } else if (contentEncoding === 'deflate') {
                        original = zlib.inflateSync(buffer).length;
                    }
                } catch (err) {
                    // If decompression fails, sizes are the same
                }
                
                const ratio = original > 0 
                    ? ((1 - compressed / original) * 100).toFixed(1)
                    : 0;
                
                resolve({
                    url,
                    encoding: contentEncoding,
                    compressed,
                    original,
                    ratio,
                    varyHeader,
                    statusCode: res.statusCode,
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

async function testMultipleUrls(urls) {
    console.log(`${colors.blue}🔍 Testing Compression...${colors.reset}\n`);
    
    const results = [];
    
    for (const url of urls) {
        try {
            // Test with Brotli
            const brResult = await checkCompression(url, 'br');
            
            // Test with Gzip (for comparison)
            const gzResult = await checkCompression(url, 'gzip');
            
            // Test without compression
            const noneResult = await checkCompression(url, '');
            
            results.push({
                url,
                brotli: brResult,
                gzip: gzResult,
                none: noneResult,
            });
            
            // Print result
            console.log(`${colors.yellow}URL:${colors.reset} ${url}`);
            console.log(`${colors.gray}Status: ${brResult.statusCode}${colors.reset}`);
            console.log('');
            
            // Brotli
            const brColor = brResult.encoding === 'br' ? colors.green : colors.red;
            console.log(`  ${brColor}Brotli:${colors.reset}`);
            console.log(`    Encoding: ${brResult.encoding}`);
            console.log(`    Size: ${formatBytes(brResult.compressed)} (original: ${formatBytes(brResult.original)})`);
            console.log(`    Ratio: ${brResult.ratio}%`);
            console.log(`    Vary: ${brResult.varyHeader}`);
            console.log('');
            
            // Gzip
            const gzColor = gzResult.encoding === 'gzip' ? colors.green : colors.yellow;
            console.log(`  ${gzColor}Gzip:${colors.reset}`);
            console.log(`    Encoding: ${gzResult.encoding}`);
            console.log(`    Size: ${formatBytes(gzResult.compressed)}`);
            console.log(`    Ratio: ${gzResult.ratio}%`);
            console.log('');
            
            // Comparison
            if (brResult.encoding === 'br' && gzResult.encoding === 'gzip') {
                const savings = ((1 - brResult.compressed / gzResult.compressed) * 100).toFixed(1);
                console.log(`  ${colors.green}✓ Brotli is ${savings}% smaller than Gzip${colors.reset}`);
            } else if (brResult.encoding === 'none') {
                console.log(`  ${colors.red}✗ No compression detected${colors.reset}`);
            }
            
            console.log(`\n${'─'.repeat(70)}\n`);
            
        } catch (err) {
            console.log(`${colors.red}✗ Error testing ${url}:${colors.reset} ${err.message}\n`);
        }
    }
    
    // Summary
    console.log(`${colors.blue}📊 Summary:${colors.reset}\n`);
    
    const totalBrotli = results.filter(r => r.brotli.encoding === 'br').length;
    const totalGzip = results.filter(r => r.gzip.encoding === 'gzip').length;
    const totalNone = results.filter(r => r.brotli.encoding === 'none' && r.gzip.encoding === 'none').length;
    
    console.log(`  Brotli enabled: ${totalBrotli}/${results.length}`);
    console.log(`  Gzip enabled: ${totalGzip}/${results.length}`);
    console.log(`  No compression: ${totalNone}/${results.length}`);
    
    if (totalNone > 0) {
        console.log(`\n${colors.red}⚠ Warning: ${totalNone} URL(s) without compression${colors.reset}`);
    } else if (totalBrotli === results.length) {
        console.log(`\n${colors.green}✓ All URLs are using Brotli compression!${colors.reset}`);
    }
}

// CLI usage
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`Usage: node test-compression.js <url1> <url2> ...

Examples:
  node test-compression.js https://example.com/main.js
  node test-compression.js https://example.com/main.js https://example.com/styles.css

Environment:
  TEST_URLS - Comma-separated URLs to test
`);
    process.exit(1);
}

// Parse URLs from args or environment
const urls = args.length > 0 
    ? args 
    : (process.env.TEST_URLS || '').split(',').filter(Boolean);

if (urls.length === 0) {
    console.error('No URLs provided');
    process.exit(1);
}

// Run tests
testMultipleUrls(urls)
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(`${colors.red}Fatal error:${colors.reset}`, err);
        process.exit(1);
    });
