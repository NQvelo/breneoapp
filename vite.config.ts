import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // ⚠️ TEMPORARY WORKAROUND: Proxy API requests through frontend (development only)
    // This bypasses CORS but is NOT a production solution
    proxy:
      mode === "development"
        ? {
            "/api": {
              target: "https://breneo.onrender.com",
              changeOrigin: true,
              secure: true,
              configure: (proxy, options) => {
                // Add CORS headers to proxied requests
                proxy.on("proxyReq", (proxyReq, req, res) => {
                  proxyReq.setHeader("Origin", req.headers.origin || "");
                });
              },
            },
          }
        : {},
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
}));
