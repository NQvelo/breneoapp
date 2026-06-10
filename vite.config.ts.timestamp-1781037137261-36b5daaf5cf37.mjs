// vite.config.ts
import { defineConfig } from "file:///Users/macbookpro/breneoapp/node_modules/vite/dist/node/index.js";
import react from "file:///Users/macbookpro/breneoapp/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "fs";
import { componentTagger } from "file:///Users/macbookpro/breneoapp/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///Users/macbookpro/breneoapp/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/Users/macbookpro/breneoapp";
var packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__vite_injected_original_dirname, "package.json"), "utf-8")
);
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // ⚠️ TEMPORARY WORKAROUND: Proxy API requests through frontend (development only)
    // This bypasses CORS but is NOT a production solution
    proxy: mode === "development" ? {
      // Public industries list — proxy straight to Railway so it works even if employer-jobs-proxy (8787) is not running.
      "/api/industries": {
        target: "https://breneo-job-aggregator.up.railway.app",
        changeOrigin: true,
        secure: true
      },
      "/api/employer/companies": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/employer/staff-memberships": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/employer/access-state": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/employer/join-requests": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/employer/member-invites": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/employer/jobs": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/academy/course-analytics": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      // Job applications BFF: apply / my applications / withdraw / applicants (Breneo JWT + server secret).
      "/api/app": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/job-details": {
        target: "https://breneo-job-aggregator.up.railway.app/",
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2
        // Keep the path as-is
      },
      // Proxy all other /api requests to breneo.onrender.com
      "/api": {
        target: "https://breneo.onrender.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            proxyReq.setHeader("Origin", req.headers.origin || "");
          });
        }
      }
    } : {}
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
        description: "Breneo helps users assess their skills, explore job offers, and follow personalized learning paths with AI technology.",
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
            purpose: "any maskable"
          },
          {
            src: "/lovable-uploads/breneo-favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
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
                sizes: "96x96"
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2,ttf}"],
        globIgnores: [
          "**/favicon.ico",
          "**/lovable-uploads/academy.png",
          "**/lovable-uploads/future.png",
          "**/lovable-uploads/way.png",
          "**/lovable-uploads/full-shot-student-library.jpg",
          "**/assets/geo-vendor-*.js"
        ],
        // Keep service-worker install fast by skipping oversized optional assets.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // 2 MB
        // Handle SPA routing - fallback to index.html for navigation requests
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          // Don't fallback for API routes
          /^\/api\/.*/,
          // Don't fallback for static assets
          /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/
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
            handler: "NetworkOnly"
          },
          {
            urlPattern: /^https:\/\/breneo\.onrender\.com\/api\//i,
            handler: "NetworkOnly"
          },
          {
            // Handle navigation requests (SPA routes)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
                // 24 hours
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Handle manifest.webmanifest requests
            urlPattern: /manifest\.webmanifest$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "manifest-cache",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              }
            }
          },
          {
            // Non-API assets on Breneo origin (rare); keep network-first without mixing with /api/.
            urlPattern: ({ url }) => url.hostname === "breneo.onrender.com" && !url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "breneo-origin-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24,
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
                // 24 hours
                purgeOnQuotaError: true
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      // Avoid Workbox Cache API errors during local dev (PATCH /api, HMR, low disk space).
      devOptions: {
        enabled: false,
        type: "module"
      },
      // Additional options to handle missing routes gracefully
      injectRegister: "auto"
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || "0.0.0")
  },
  build: {
    minify: "esbuild",
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false
    },
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : []
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react-vendor";
          }
          if (id.includes("/react-router/") || id.includes("/react-router-dom/") || id.includes("/@tanstack/react-query/")) {
            return "routing-data-vendor";
          }
          if (id.includes("/recharts/") || id.includes("/d3-")) {
            return "charts-vendor";
          }
          if (id.includes("/framer-motion/") || id.includes("/three/") || id.includes("/@react-three/")) {
            return "animation-3d-vendor";
          }
          if (id.includes("/country-state-city/")) {
            return "geo-vendor";
          }
          if (id.includes("/@radix-ui/") || id.includes("/cmdk/") || id.includes("/vaul/")) {
            return "ui-vendor";
          }
          if (id.includes("/posthog-js/")) {
            return "analytics-vendor";
          }
          if (id.includes("/@supabase/") || id.includes("/firebase/")) {
            return "backend-vendor";
          }
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWNib29rcHJvL2JyZW5lb2FwcC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjYm9va3Byby9icmVuZW9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShcbiAgZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwicGFja2FnZS5qc29uXCIpLCBcInV0Zi04XCIpLFxuKSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIC8vIFx1MjZBMFx1RkUwRiBURU1QT1JBUlkgV09SS0FST1VORDogUHJveHkgQVBJIHJlcXVlc3RzIHRocm91Z2ggZnJvbnRlbmQgKGRldmVsb3BtZW50IG9ubHkpXG4gICAgLy8gVGhpcyBieXBhc3NlcyBDT1JTIGJ1dCBpcyBOT1QgYSBwcm9kdWN0aW9uIHNvbHV0aW9uXG4gICAgcHJveHk6XG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgPyB7XG4gICAgICAgICAgICAvLyBQdWJsaWMgaW5kdXN0cmllcyBsaXN0IFx1MjAxNCBwcm94eSBzdHJhaWdodCB0byBSYWlsd2F5IHNvIGl0IHdvcmtzIGV2ZW4gaWYgZW1wbG95ZXItam9icy1wcm94eSAoODc4NykgaXMgbm90IHJ1bm5pbmcuXG4gICAgICAgICAgICBcIi9hcGkvaW5kdXN0cmllc1wiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwczovL2JyZW5lby1qb2ItYWdncmVnYXRvci51cC5yYWlsd2F5LmFwcFwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvZW1wbG95ZXIvY29tcGFuaWVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL3N0YWZmLW1lbWJlcnNoaXBzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2FjY2Vzcy1zdGF0ZVwiOiB7XG4gICAgICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vMTI3LjAuMC4xOjg3ODdcIixcbiAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiL2FwaS9lbXBsb3llci9qb2luLXJlcXVlc3RzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL21lbWJlci1pbnZpdGVzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2VtcGxveWVyL2pvYnNcIjoge1xuICAgICAgICAgICAgICB0YXJnZXQ6IFwiaHR0cDovLzEyNy4wLjAuMTo4Nzg3XCIsXG4gICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcIi9hcGkvYWNhZGVteS9jb3Vyc2UtYW5hbHl0aWNzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gSm9iIGFwcGxpY2F0aW9ucyBCRkY6IGFwcGx5IC8gbXkgYXBwbGljYXRpb25zIC8gd2l0aGRyYXcgLyBhcHBsaWNhbnRzIChCcmVuZW8gSldUICsgc2VydmVyIHNlY3JldCkuXG4gICAgICAgICAgICBcIi9hcGkvYXBwXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODc4N1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCIvYXBpL2pvYi1kZXRhaWxzXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vYnJlbmVvLWpvYi1hZ2dyZWdhdG9yLnVwLnJhaWx3YXkuYXBwL1wiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLCAvLyBLZWVwIHRoZSBwYXRoIGFzLWlzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gUHJveHkgYWxsIG90aGVyIC9hcGkgcmVxdWVzdHMgdG8gYnJlbmVvLm9ucmVuZGVyLmNvbVxuICAgICAgICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vYnJlbmVvLm9ucmVuZGVyLmNvbVwiLFxuICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgICAgICAgY29uZmlndXJlOiAocHJveHksIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgQ09SUyBoZWFkZXJzIHRvIHByb3hpZWQgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICBwcm94eS5vbihcInByb3h5UmVxXCIsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcihcIk9yaWdpblwiLCByZXEuaGVhZGVycy5vcmlnaW4gfHwgXCJcIik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH1cbiAgICAgICAgOiB7fSxcbiAgfSxcbiAgYmFzZTogXCIvXCIsXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogXCJwcm9tcHRcIixcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcInJvYm90cy50eHRcIiwgXCJsb3ZhYmxlLXVwbG9hZHMvKi5wbmdcIl0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiBcIkJyZW5lbyAtIEFJLVBvd2VyZWQgTGVhcm5pbmcgJiBKb2IgTWF0Y2hpbmcgUGxhdGZvcm1cIixcbiAgICAgICAgc2hvcnRfbmFtZTogXCJCcmVuZW9cIixcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgXCJCcmVuZW8gaGVscHMgdXNlcnMgYXNzZXNzIHRoZWlyIHNraWxscywgZXhwbG9yZSBqb2Igb2ZmZXJzLCBhbmQgZm9sbG93IHBlcnNvbmFsaXplZCBsZWFybmluZyBwYXRocyB3aXRoIEFJIHRlY2hub2xvZ3kuXCIsXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiNmZmZmZmZcIixcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZmZmZmZmXCIsXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxuICAgICAgICBvcmllbnRhdGlvbjogXCJwb3J0cmFpdFwiLFxuICAgICAgICBzY29wZTogXCIvXCIsXG4gICAgICAgIHN0YXJ0X3VybDogXCIvXCIsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBcIi9sb3ZhYmxlLXVwbG9hZHMvYnJlbmVvLWZhdmljb24ucG5nXCIsXG4gICAgICAgICAgICBzaXplczogXCIxOTJ4MTkyXCIsXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnkgbWFza2FibGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogXCIvbG92YWJsZS11cGxvYWRzL2JyZW5lby1mYXZpY29uLnBuZ1wiLFxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgIHB1cnBvc2U6IFwiYW55IG1hc2thYmxlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgY2F0ZWdvcmllczogW1wiZWR1Y2F0aW9uXCIsIFwicHJvZHVjdGl2aXR5XCIsIFwiYnVzaW5lc3NcIl0sXG4gICAgICAgIHNob3J0Y3V0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiRGFzaGJvYXJkXCIsXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkRhc2hib2FyZFwiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVmlldyB5b3VyIGRhc2hib2FyZFwiLFxuICAgICAgICAgICAgdXJsOiBcIi9kYXNoYm9hcmRcIixcbiAgICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzcmM6IFwiL2xvdmFibGUtdXBsb2Fkcy9icmVuZW8tZmF2aWNvbi5wbmdcIixcbiAgICAgICAgICAgICAgICBzaXplczogXCI5Nng5NlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxzdmcsd29mZix3b2ZmMix0dGZ9XCJdLFxuICAgICAgICBnbG9iSWdub3JlczogW1xuICAgICAgICAgIFwiKiovZmF2aWNvbi5pY29cIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy9hY2FkZW15LnBuZ1wiLFxuICAgICAgICAgIFwiKiovbG92YWJsZS11cGxvYWRzL2Z1dHVyZS5wbmdcIixcbiAgICAgICAgICBcIioqL2xvdmFibGUtdXBsb2Fkcy93YXkucG5nXCIsXG4gICAgICAgICAgXCIqKi9sb3ZhYmxlLXVwbG9hZHMvZnVsbC1zaG90LXN0dWRlbnQtbGlicmFyeS5qcGdcIixcbiAgICAgICAgICBcIioqL2Fzc2V0cy9nZW8tdmVuZG9yLSouanNcIixcbiAgICAgICAgXSxcbiAgICAgICAgLy8gS2VlcCBzZXJ2aWNlLXdvcmtlciBpbnN0YWxsIGZhc3QgYnkgc2tpcHBpbmcgb3ZlcnNpemVkIG9wdGlvbmFsIGFzc2V0cy5cbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDIgKiAxMDI0ICogMTAyNCwgLy8gMiBNQlxuICAgICAgICAvLyBIYW5kbGUgU1BBIHJvdXRpbmcgLSBmYWxsYmFjayB0byBpbmRleC5odG1sIGZvciBuYXZpZ2F0aW9uIHJlcXVlc3RzXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbXG4gICAgICAgICAgLy8gRG9uJ3QgZmFsbGJhY2sgZm9yIEFQSSByb3V0ZXNcbiAgICAgICAgICAvXlxcL2FwaVxcLy4qLyxcbiAgICAgICAgICAvLyBEb24ndCBmYWxsYmFjayBmb3Igc3RhdGljIGFzc2V0c1xuICAgICAgICAgIC9cXC4oPzpwbmd8anBnfGpwZWd8c3ZnfGdpZnx3ZWJwfGljb3x3b2ZmfHdvZmYyfHR0Znxlb3QpJC8sXG4gICAgICAgIF0sXG4gICAgICAgIC8vIFNraXAgd2FpdGluZyBhbmQgY2xhaW0gY2xpZW50cyBmb3IgZmFzdGVyIHVwZGF0ZXNcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcbiAgICAgICAgLy8gRG9uJ3QgcHJlY2FjaGUgcm91dGVzIC0gaGFuZGxlIHRoZW0gYXQgcnVudGltZVxuICAgICAgICBkb250Q2FjaGVCdXN0VVJMc01hdGNoaW5nOiAvXFwuXFx3ezh9XFwuLyxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAvLyBOZXZlciBjYWNoZSBBUEkgdHJhZmZpYyBcdTIwMTQgYXZvaWRzIENhY2hlLnB1dCBmYWlsdXJlcyBvbiBQQVRDSC9QT1NUIGFuZCBzdGFsZSBhdXRoIGRhdGEuXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+IHVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9cIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2JyZW5lb1xcLm9ucmVuZGVyXFwuY29tXFwvYXBpXFwvL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgbmF2aWdhdGlvbiByZXF1ZXN0cyAoU1BBIHJvdXRlcylcbiAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5tb2RlID09PSBcIm5hdmlnYXRlXCIsXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwicGFnZXMtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnApJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJDYWNoZUZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJpbWFnZXMtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCwgLy8gMzAgZGF5c1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpqc3xjc3MpJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJTdGFsZVdoaWxlUmV2YWxpZGF0ZVwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYXNzZXRzLWNhY2hlXCIsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMjAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogNyxcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gSGFuZGxlIG1hbmlmZXN0LndlYm1hbmlmZXN0IHJlcXVlc3RzXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvbWFuaWZlc3RcXC53ZWJtYW5pZmVzdCQvaSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiTmV0d29ya0ZpcnN0XCIsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJtYW5pZmVzdC1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMSxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQsIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgLy8gTm9uLUFQSSBhc3NldHMgb24gQnJlbmVvIG9yaWdpbiAocmFyZSk7IGtlZXAgbmV0d29yay1maXJzdCB3aXRob3V0IG1peGluZyB3aXRoIC9hcGkvLlxuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+XG4gICAgICAgICAgICAgIHVybC5ob3N0bmFtZSA9PT0gXCJicmVuZW8ub25yZW5kZXIuY29tXCIgJiZcbiAgICAgICAgICAgICAgIXVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9cIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwiYnJlbmVvLW9yaWdpbi1jYWNoZVwiLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMzAsXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0LFxuICAgICAgICAgICAgICAgIHB1cmdlT25RdW90YUVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcLy4qXFwuc3VwYWJhc2VcXC5jb1xcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtGaXJzdFwiLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6IFwic3VwYWJhc2UtY2FjaGVcIixcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCwgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgICBwdXJnZU9uUXVvdGFFcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgLy8gQXZvaWQgV29ya2JveCBDYWNoZSBBUEkgZXJyb3JzIGR1cmluZyBsb2NhbCBkZXYgKFBBVENIIC9hcGksIEhNUiwgbG93IGRpc2sgc3BhY2UpLlxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdHlwZTogXCJtb2R1bGVcIixcbiAgICAgIH0sXG4gICAgICAvLyBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gaGFuZGxlIG1pc3Npbmcgcm91dGVzIGdyYWNlZnVsbHlcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBcImF1dG9cIixcbiAgICB9KSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbi52ZXJzaW9uIHx8IFwiMC4wLjBcIiksXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICB0YXJnZXQ6IFwiZXMyMDIwXCIsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgbW9kdWxlUHJlbG9hZDoge1xuICAgICAgcG9seWZpbGw6IGZhbHNlLFxuICAgIH0sXG4gICAgZXNidWlsZDoge1xuICAgICAgZHJvcDogbW9kZSA9PT0gXCJwcm9kdWN0aW9uXCIgPyBbXCJjb25zb2xlXCIsIFwiZGVidWdnZXJcIl0gOiBbXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSByZXR1cm47XG5cbiAgICAgICAgICAvLyBLZWVwIFJlYWN0IHN0YWNrIGluIG9uZSBzdGFibGUgY2h1bmsuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvcmVhY3QvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1kb20vXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9zY2hlZHVsZXIvXCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJyZWFjdC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSb3V0ZXIgKyBkYXRhL2NhY2hlIGxheWVyIHVzZWQgb24gbW9zdCBwYWdlcy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1yb3V0ZXIvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9yZWFjdC1yb3V0ZXItZG9tL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5L1wiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuIFwicm91dGluZy1kYXRhLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEhlYXZ5IGNoYXJ0aW5nIGxpYnMuXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiL3JlY2hhcnRzL1wiKSB8fCBpZC5pbmNsdWRlcyhcIi9kMy1cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBcImNoYXJ0cy12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBBbmltYXRpb24gYW5kIDNEIGRlcGVuZGVuY2llcyBhcmUgbGFyZ2UgYW5kIHJvdXRlLXNwZWNpZmljLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL2ZyYW1lci1tb3Rpb24vXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi90aHJlZS9cIikgfHxcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwiL0ByZWFjdC10aHJlZS9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcImFuaW1hdGlvbi0zZC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBWZXJ5IGxhcmdlIHdvcmxkIGNvdW50cnkvY2l0eSBkYXRhc2V0OyBrZWVwIGlzb2xhdGVkIGFuZCBsYXp5LWxvYWRhYmxlLlxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9jb3VudHJ5LXN0YXRlLWNpdHkvXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJnZW8tdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVUkgcHJpbWl0aXZlcyAoUmFkaXggKyB1dGlsaXR5IHdyYXBwZXJzKS5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9AcmFkaXgtdWkvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi9jbWRrL1wiKSB8fFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvdmF1bC9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcInVpLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9wb3N0aG9nLWpzL1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYW5hbHl0aWNzLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9Ac3VwYWJhc2UvXCIpIHx8IGlkLmluY2x1ZGVzKFwiL2ZpcmViYXNlL1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYmFja2VuZC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLFNBQVMsb0JBQW9CO0FBQ2hTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBTHhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sY0FBYyxLQUFLO0FBQUEsRUFDdkIsR0FBRyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxjQUFjLEdBQUcsT0FBTztBQUNsRTtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdOLE9BQ0UsU0FBUyxnQkFDTDtBQUFBO0FBQUEsTUFFRSxtQkFBbUI7QUFBQSxRQUNqQixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFB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QUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGlCQUFpQixLQUFLLFVBQVUsWUFBWSxXQUFXLE9BQU87QUFBQSxFQUNoRTtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU0sU0FBUyxlQUFlLENBQUMsV0FBVyxVQUFVLElBQUksQ0FBQztBQUFBLElBQzNEO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRztBQUdsQyxjQUNFLEdBQUcsU0FBUyxTQUFTLEtBQ3JCLEdBQUcsU0FBUyxhQUFhLEtBQ3pCLEdBQUcsU0FBUyxhQUFhLEdBQ3pCO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBR0EsY0FDRSxHQUFHLFNBQVMsZ0JBQWdCLEtBQzVCLEdBQUcsU0FBUyxvQkFBb0IsS0FDaEMsR0FBRyxTQUFTLHlCQUF5QixHQUNyQztBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUdBLGNBQUksR0FBRyxTQUFTLFlBQVksS0FBSyxHQUFHLFNBQVMsTUFBTSxHQUFHO0FBQ3BELG1CQUFPO0FBQUEsVUFDVDtBQUdBLGNBQ0UsR0FBRyxTQUFTLGlCQUFpQixLQUM3QixHQUFHLFNBQVMsU0FBUyxLQUNyQixHQUFHLFNBQVMsZ0JBQWdCLEdBQzVCO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBR0EsY0FBSSxHQUFHLFNBQVMsc0JBQXNCLEdBQUc7QUFDdkMsbUJBQU87QUFBQSxVQUNUO0FBR0EsY0FDRSxHQUFHLFNBQVMsYUFBYSxLQUN6QixHQUFHLFNBQVMsUUFBUSxLQUNwQixHQUFHLFNBQVMsUUFBUSxHQUNwQjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxhQUFhLEtBQUssR0FBRyxTQUFTLFlBQVksR0FBRztBQUMzRCxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
