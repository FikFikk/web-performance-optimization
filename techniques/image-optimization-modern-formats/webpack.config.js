const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist',
  },
  module: {
    rules: [
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
        },
      },
    ],
  },
  plugins: [
    // Image optimization & format conversion
    new ImageMinimizerPlugin({
      // Minimize existing images
      minimizer: {
        implementation: ImageMinimizerPlugin.sharpMinify,
        options: {
          encodeOptions: {
            jpeg: { quality: 85, progressive: true },
            png: { compressionLevel: 9, adaptiveFiltering: true },
          },
        },
      },
      // Generate additional formats (WebP, AVIF)
      generator: [
        {
          preset: 'webp',
          implementation: ImageMinimizerPlugin.sharpGenerate,
          options: {
            encodeOptions: {
              webp: { quality: 85, effort: 6 },
            },
          },
        },
        {
          preset: 'avif',
          implementation: ImageMinimizerPlugin.sharpGenerate,
          options: {
            encodeOptions: {
              avif: { quality: 80, effort: 6, chromaSubsampling: '4:4:4' },
            },
          },
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
};
