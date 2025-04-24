const path = require('path');

module.exports = {
  entry: './src/index.js', // Główny plik wejściowy
  optimization: {
    splitChunks: false, // Disable code splitting entirely
  },

  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    chunkFormat: false, // Disable chunk formatting
  },

  module: {
    rules: [
      {
        test: /\.js$/, // Obsługa plików JS
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Możesz dodać Babela jeśli potrzebujesz
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/, // Obsługa obrazów
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/, // Obsługa czcionek
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]',
        },
      },
    ],
  },
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "vm": require.resolve("vm-browserify"),
    }
  },
  devtool: 'source-map', // Generowanie source maps
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
};