// vite.config.ts
import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => ({
  // dev ใช้ '/', prod ใช้ './' เพื่อให้ asset path เป็น relative บน file://
  base: mode === "development" ? "/" : "./",

  // คุณตั้ง root เป็น src อยู่แล้ว โอเค
  root: "./src",
  plugins: [react(), svgr()],

  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    // ถ้าอยาก debug เพิ่มก็เปิด sourcemap ได้:
    // sourcemap: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: { port: 5173, strictPort: true },
}));
