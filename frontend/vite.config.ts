import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port RIENG voi dvbh (5173/8787) va linh-kien-app (5174/8788) de ca 3 he chay dev song song khong
// dung do - xem backend/package.json (port 8789) va CLAUDE.md.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://localhost:8789",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
