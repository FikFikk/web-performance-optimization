// Webpack Configuration dengan Brotli + Gzip Pre-Compression
const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        clean: true,
    },
    
    optimization: {
        minimize: true,
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: 10,
                },
            },
        },
    },
    
    plugins: [
        // Brotli Compression (highest priority)
        new BrotliPlugin({
            asset: '[path].br[query]',
            test: /\.(js|css|html|svg|json|txt|xml)$/,
            threshold: 10240,        // Only compress files > 10KB
            minRatio: 0.8,           // Only if compression saves > 20%
            quality: 11,             // Maximum compression (build-time)
        }),
        
        // Gzip Compression (fallback)
        new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg|json|txt|xml)$/,
            threshold: 10240,
            minRatio: 0.8,
            compressionOptions: {
                level: 9,            // Maximum gzip compression
            },
        }),
        
        // Bundle size analyzer (optional, for development)
        process.env.ANALYZE && new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
        }),
    ].filter(Boolean),
    
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};

// Example package.json scripts:
/*
{
  "scripts": {
    "build": "webpack",
    "build:analyze": "ANALYZE=true webpack",
    "test:compression": "node test-compression.js"
  },
  "devDependencies": {
    "webpack": "^5.88.0",
    "compression-webpack-plugin": "^10.0.0",
    "brotli-webpack-plugin": "^1.1.0",
    "webpack-bundle-analyzer": "^4.9.0"
  }
}
*/
