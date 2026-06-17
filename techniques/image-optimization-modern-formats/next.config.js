module.exports = {
  images: {
    // Format yang akan di-serve otomatis
    formats: ['image/avif', 'image/webp'],
    
    // Breakpoint untuk responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Quality settings
    quality: 85,
    
    // Domains yang diizinkan untuk external images
    domains: ['yourdomain.com', 'cdn.yourdomain.com'],
    
    // Remote patterns untuk Next.js 13+
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yourdomain.com',
        pathname: '/images/**',
      },
    ],
    
    // Minimize layout shift
    minimumCacheTTL: 60,
    
    // Disable static imports jika perlu
    disableStaticImages: false,
    
    // Unoptimized untuk development speed (optional)
    // unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Compress output
  compress: true,
  
  // Strict mode untuk React 18+
  reactStrictMode: true,
  
  // Webpack config untuk additional image processing
  webpack: (config, { isServer }) => {
    // Image loader config
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: 8192, // Inline images < 8KB
        },
      },
    });
    
    return config;
  },
};
