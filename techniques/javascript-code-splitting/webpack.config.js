const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shouldAnalyze = env && env.analyze;

  return {
    entry: './src/index.js',
    
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/',
      clean: true
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react',
                ['@babel/preset-env', { modules: false }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },

    resolve: {
      extensions: ['.js', '.jsx']
    },

    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // React & React-DOM di chunk terpisah (stable, jarang berubah)
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
            reuseExistingChunk: true
          },
          
          // Router di chunk terpisah
          router: {
            test: /[\\/]node_modules[\\/]react-router(-dom)?[\\/]/,
            name: 'router',
            priority: 15,
            reuseExistingChunk: true
          },
          
          // Vendor libraries lainnya
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
            minChunks: 2
          },
          
          // Common code dari aplikasi kita
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'common'
          }
        },
        
        // Optimal chunk size
        maxInitialRequests: 5,
        maxAsyncRequests: 5,
        minSize: 20000, // 20KB minimum
        maxSize: 244000, // 244KB maximum (split if larger)
      },
      
      // Runtime chunk terpisah untuk better long-term caching
      runtimeChunk: 'single',
      
      // Module IDs yang deterministic (stabil across builds)
      moduleIds: 'deterministic',
      
      // Minification
      minimize: isProduction,
      minimizer: isProduction ? [
        '...' // Use defaults (TerserPlugin)
      ] : []
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),

      // Gzip compression untuk production
      ...(isProduction ? [
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240, // Only compress files > 10KB
          minRatio: 0.8
        })
      ] : []),

      // Bundle analyzer (jalankan dengan --env analyze)
      ...(shouldAnalyze ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: 'bundle-report.html',
          openAnalyzer: true,
          generateStatsFile: true,
          statsFilename: 'bundle-stats.json'
        })
      ] : [])
    ],

    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
      open: true
    },

    // Performance budgets
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 250000, // 250KB
      maxAssetSize: 250000
    },

    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};
