import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("pdfjs-dist")) return "vendor-pdf";
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
}));
