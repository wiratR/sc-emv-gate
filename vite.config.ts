import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: './src',
  plugins: [react(), svgr()], // ← เอา tsconfigPaths ออก
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
