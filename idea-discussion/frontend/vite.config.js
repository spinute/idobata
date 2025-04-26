import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Ensure client-side routing works properly
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
