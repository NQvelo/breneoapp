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
  base: "/",
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Preserve .htaccess and other dot files
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.startsWith(".")) {
            return assetInfo.name;
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
}));
