import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api/green": {
        target: "https://api.green-api.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/green/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'auth-page': ['./src/pages/AuthPage'],
          'chat-page': ['./src/pages/ChatPage'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
