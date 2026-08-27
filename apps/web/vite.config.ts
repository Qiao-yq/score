import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// 内部包（ui/contracts）在开发期直接指向源码，避免每次先 build dist。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@task/ui': resolve(__dirname, '../../packages/ui/src'),
      '@task/contracts': resolve(__dirname, '../../packages/contracts/src'),
    },
  },
  server: {
    port: 5173,
  },
});
