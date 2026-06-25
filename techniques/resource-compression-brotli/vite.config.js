// Vite Configuration dengan Brotli + Gzip Pre-Compression
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
    plugins: [
        react(),
        
        // Brotli Compression
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,        // 10KB minimum
            algorithm: 'brotliCompress',
            ext: '.br',
            compressionOptions: {
                level: 11,           // Maximum compression for production
            },
            deleteOriginFile: false, // Keep original files
        }),
        
        // Gzip Compression (fallback)
        viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'gzip',
            ext: '.gz',
            compressionOptions: {
                level: 9,
            },
            deleteOriginFile: false,
        }),
    ],
    
    build: {
        target: 'es2015',
        outDir: 'dist',
        assetsDir: 'assets',
        
        // Optimize chunk size
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-router': ['react-router-dom'],
                },
            },
        },
        
        // Generate source maps (but compress them too)
        sourcemap: true,
        
        // Minimum chunk size warning (KB)
        chunkSizeWarningLimit: 500,
    },
    
    // Preview server with compression
    preview: {
        port: 3000,
        headers: {
            'Vary': 'Accept-Encoding',
        },
    },
});

// Example package.json:
/*
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "analyze": "vite-bundle-visualizer"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite-plugin-compression": "^0.5.1"
  }
}
*/
