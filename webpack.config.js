const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
      background: './src/background.ts',
      content: './src/content.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        }
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/manifest.json', to: 'manifest.json' },
          { from: 'src/*.png', to: '[name][ext]' },
          { from: 'src/sidebar.html', to: 'sidebar.html' },
          { from: 'src/styles', to: 'styles' },
        ]
      })
    ]
};