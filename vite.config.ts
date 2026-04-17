import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version?: string };

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
            // Public industries list — proxy straight to Railway so it works even if employer-jobs-proxy (8787) is not running.
            "/api/industries": {
              target: "https://breneo-job-aggregator.up.railway.app",
              changeOrigin: true,
              secure: true,
            },
            "/api/employer/companies": {
              target: "http://127.0.0.1:8787",
              changeOrigin: true,
            },
            "/api/employer/staff-memberships": {
              target: "http://127.0.0.1:8787",
              changeOrigin: true,
            },
            "/api/employer/jobs": {
              target: "http://127.0.0.1:8787",
              changeOrigin: true,
            },
            "/api/job-details": {
              target: "https://breneo-job-aggregator.up.railway.app/",
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path, // Keep the path as-is
            },
            // Proxy all other /api requests to breneo.onrender.com
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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["robots.txt", "lovable-uploads/*.png"],
      manifest: {
        name: "Breneo - AI-Powered Learning & Job Matching Platform",
        short_name: "Breneo",
        description:
          "Breneo helps users assess their skills, explore job offers, and follow personalized learning paths with AI technology.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["education", "productivity", "business"],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your dashboard",
            url: "/dashboard",
            icons: [
              {
                src: "/lovable-uploads/breneo-favicon.png",
                sizes: "96x96",
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2,ttf}"],
        globIgnores: [
          "**/favicon.ico",
          "**/lovable-uploads/academy.png",
          "**/lovable-uploads/future.png",
          "**/lovable-uploads/way.png",
          "**/lovable-uploads/full-shot-student-library.jpg",
          "**/assets/geo-vendor-*.js",
        ],
        // Keep service-worker install fast by skipping oversized optional assets.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2 MB
        // Handle SPA routing - fallback to index.html for navigation requests
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          // Don't fallback for API routes
          /^\/api\/.*/,
          // Don't fallback for static assets
          /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
        ],
        // Skip waiting and claim clients for faster updates
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache routes - handle them at runtime
        dontCacheBustURLsMatching: /\.\w{8}\./,
        runtimeCaching: [
          // Never cache API traffic — avoids Cache.put failures on PATCH/POST and stale auth data.
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/breneo\.onrender\.com\/api\//i,
            handler: "NetworkOnly",
          },
          {
            // Handle navigation requests (SPA routes)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Handle manifest.webmanifest requests
            urlPattern: /manifest\.webmanifest$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "manifest-cache",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            // Non-API assets on Breneo origin (rare); keep network-first without mixing with /api/.
            urlPattern: ({ url }) =>
              url.hostname === "breneo.onrender.com" &&
              !url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "breneo-origin-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24,
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      // Avoid Workbox Cache API errors during local dev (PATCH /api, HMR, low disk space).
      devOptions: {
        enabled: false,
        type: "module",
      },
      // Additional options to handle missing routes gracefully
      injectRegister: "auto",
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0"),
  },
  build: {
    minify: "esbuild",
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
    },
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Keep React stack in one stable chunk.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }

          // Router + data/cache layer used on most pages.
          if (
            id.includes("/react-router/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/@tanstack/react-query/")
          ) {
            return "routing-data-vendor";
          }

          // Heavy charting libs.
          if (id.includes("/recharts/") || id.includes("/d3-")) {
            return "charts-vendor";
          }

          // Animation and 3D dependencies are large and route-specific.
          if (
            id.includes("/framer-motion/") ||
            id.includes("/three/") ||
            id.includes("/@react-three/")
          ) {
            return "animation-3d-vendor";
          }

          // Very large world country/city dataset; keep isolated and lazy-loadable.
          if (id.includes("/country-state-city/")) {
            return "geo-vendor";
          }

          // UI primitives (Radix + utility wrappers).
          if (
            id.includes("/@radix-ui/") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/")
          ) {
            return "ui-vendor";
          }

          if (id.includes("/posthog-js/")) {
            return "analytics-vendor";
          }

          if (id.includes("/@supabase/") || id.includes("/firebase/")) {
            return "backend-vendor";
          }
        },
      },
    },
  },
}));
