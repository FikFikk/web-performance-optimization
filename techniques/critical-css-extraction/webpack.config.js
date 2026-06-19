/**
 * Webpack Configuration with Critical CSS Plugin
 * 
 * This config demonstrates how to integrate critical CSS extraction
 * into your webpack build process.
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CrittersPlugin = require('critters-webpack-plugin');

module.exports = {
  mode: 'production',
  
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
        type: 'asset/resource'
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true
      }
    }),
    
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    
    // Critters: Automatically extract and inline critical CSS
    new CrittersPlugin({
      // Inline critical CSS
      preload: 'swap',
      
      // Don't remove original CSS files
      pruneSource: false,
      
      // Merge multiple media queries
      mergeStylesheets: true,
      
      // External stylesheet strategy
      // 'body' - load async at end of body
      // 'media' - use media="print" trick
      // 'swap' - use preload + swap (recommended)
      preloadFonts: true,
      
      // Font loading strategy
      // 'swap' - font-display: swap
      // 'fallback' - font-display: fallback
      fonts: true,
      
      // Additional options
      noscriptFallback: true,
      inlineFonts: false,
      compress: true,
      
      // Logging
      logLevel: 'info'
    })
  ],
  
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true
        }
      }
    }
  }
};
