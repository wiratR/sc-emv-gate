import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: './src',
  plugins: [react()], // ← เอา tsconfigPaths ออก
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ใช้ alias ตรงๆ
    },
  },
  server: { port: 5173 }
});
