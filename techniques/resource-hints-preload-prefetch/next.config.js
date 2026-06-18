// Next.js configuration dengan Resource Hints optimization
// File: next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['cdn.example.com', 'images.unsplash.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers untuk resource hints
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Preconnect ke critical origins via HTTP headers
          {
            key: 'Link',
            value: [
              '<https://fonts.googleapis.com>; rel=preconnect',
              '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
              '<https://cdn.example.com>; rel=preconnect',
            ].join(', '),
          },
        ],
      },
    ];
  },
  
  // Webpack configuration untuk preload
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Preload critical chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
