import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],

  // IMPORTANT: Your project root is the repo root, not "client"
  root: ".",  

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  build: {
    outDir: "dist",       // you can change if you want, but this is standard
    emptyOutDir: true,
  },

  server: {
    fs: {
      strict: false,
    },
  },
});
