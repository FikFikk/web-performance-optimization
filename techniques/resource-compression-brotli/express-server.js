// Express Server dengan Dynamic Brotli + Gzip Compression
const express = require('express');
const path = require('path');
const shrinkRay = require('shrink-ray-current');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: Brotli + Gzip compression
app.use(shrinkRay({
    // Brotli settings
    brotli: {
        quality: 4,  // Fast compression for dynamic content (4-6 recommended)
    },
    
    // Gzip fallback
    zlib: {
        level: 6,    // Balanced gzip level
    },
    
    // Only compress files > 1KB
    threshold: 1024,
    
    // Filter function
    filter: (req, res) => {
        // Skip if client doesn't support compression
        if (req.headers['x-no-compression']) {
            return false;
        }
        
        // Skip already-compressed formats
        const contentType = res.getHeader('Content-Type');
        if (contentType && (
            contentType.includes('image/jpeg') ||
            contentType.includes('image/png') ||
            contentType.includes('image/webp') ||
            contentType.includes('video/') ||
            contentType.includes('audio/')
        )) {
            return false;
        }
        
        // Compress everything else
        return true;
    },
}));

// Serve static files with pre-compressed versions
app.use(express.static('dist', {
    maxAge: '1y',
    immutable: true,
    
    setHeaders: (res, filepath) => {
        // Security headers
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'DENY');
        
        // Check for pre-compressed files
        const acceptEncoding = res.req.headers['accept-encoding'] || '';
        
        // Try Brotli first
        if (acceptEncoding.includes('br')) {
            const brPath = filepath + '.br';
            if (fs.existsSync(brPath)) {
                res.set('Content-Encoding', 'br');
                res.set('Vary', 'Accept-Encoding');
                return;
            }
        }
        
        // Fallback to Gzip
        if (acceptEncoding.includes('gzip')) {
            const gzPath = filepath + '.gz';
            if (fs.existsSync(gzPath)) {
                res.set('Content-Encoding', 'gzip');
                res.set('Vary', 'Accept-Encoding');
                return;
            }
        }
        
        // No pre-compressed file found, let shrink-ray compress dynamically
        res.set('Vary', 'Accept-Encoding');
    },
}));

// API endpoint (dynamic compression)
app.get('/api/data', (req, res) => {
    // Large JSON response
    const data = {
        users: Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            created: new Date().toISOString(),
        })),
    };
    
    res.json(data);
    // shrink-ray will automatically compress this response
});

// Health check (no compression needed)
app.get('/health', (req, res) => {
    res.set('x-no-compression', '1');
    res.send('OK');
});

// Compression info endpoint (for testing)
app.get('/compression-info', (req, res) => {
    const acceptEncoding = req.headers['accept-encoding'] || 'none';
    
    res.json({
        clientSupports: {
            brotli: acceptEncoding.includes('br'),
            gzip: acceptEncoding.includes('gzip'),
            deflate: acceptEncoding.includes('deflate'),
        },
        serverConfig: {
            brotliQuality: 4,
            gzipLevel: 6,
            threshold: '1KB',
        },
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Brotli compression: enabled (quality 4)`);
    console.log(`✅ Gzip compression: enabled (level 6)`);
    console.log(`📦 Serving pre-compressed files from /dist`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Example package.json:
/*
{
  "name": "compression-example",
  "version": "1.0.0",
  "scripts": {
    "start": "node express-server.js",
    "dev": "nodemon express-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "shrink-ray-current": "^4.1.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/
