import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    // Polyfills for Node.js modules (crypto, buffer, etc.)
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer', 'vm'],
    }),
  ],
  build: {
    sourcemap: true, // Equivalent to devtool: 'source-map'
  },
});